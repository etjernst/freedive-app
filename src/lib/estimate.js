import { repSegments, isMaxAttempt } from './session.js'

// Time estimation for exercises and sessions. Everything returns seconds (or
// null when an input the estimate depends on is missing, e.g. an unset PB or
// pace). The UI turns null into an honest "set X to estimate" rather than a
// fake number.

// Qualitative hold/distance target as a fraction of PB. A max attempt is
// timed at 90% (the day's best is rarely the PB); "submax" spans 65-90% across
// a training cycle, so 70% is a middle value and an exact target belongs in
// the % PB unit.
export const QUAL_PCT = { first_discomfort: 0.5, submax: 0.7, strong_submax: 0.8, close_to_max: 0.85, max: 0.9 }

// A max attempt (see isMaxAttempt in session.js) adds preparation before and
// recovery after (settings.attempt_prep_s / attempt_recovery_s).
export const DEFAULT_ATTEMPT_PREP_S = 300
export const DEFAULT_ATTEMPT_RECOVERY_S = 300

export function attemptOverheadSeconds(settings) {
  return {
    prep: settings.attempt_prep_s ?? DEFAULT_ATTEMPT_PREP_S,
    recovery: settings.attempt_recovery_s ?? DEFAULT_ATTEMPT_RECOVERY_S,
  }
}

// Qualitative recovery as a multiple of the preceding effort's duration.
export const QUAL_RECOVERY_MULT = { minimal: 1.0, adequate: 1.5, full: 2.0 }

// Terminations whose rep count is not knowable in advance; they need a
// per-exercise planning estimate (ex.plan_estimate.reps) to be timed.
const OPEN_TERMS = new Set(['until_failure', 'until_quality_drops', 'until_1c', 'until_utb'])

// Templates that swim at a pace other than the cruise pace_s_per_25.
const SPRINT_TEMPLATES = new Set(['dyn-sprints'])
const SURFACE_TEMPLATES = new Set(['dyn-hypercapnic', 'seals-hypercapnic-swim', 'seals-recovery-swim'])

// The sprint pace in settings is the full-sprint pace: 'max_sprint' swims at
// it, 'sprint' at the midpoint between it and the cruise pace. When no sprint
// pace is set, both fall back to the cruise pace (an overestimate, still a
// number) and say so through `notes`.
function paceFor(rep, ex, settings, notes) {
  if (ex.discipline === 'swim' || SURFACE_TEMPLATES.has(ex.template_id)) return settings.swim_pace_s_per_25 ?? null
  const cruise = settings.pace_s_per_25?.[ex.discipline] ?? null
  // Per-rep speed wins; the sprint-template list is a fallback for legacy data.
  const speed = rep?.pace ?? (SPRINT_TEMPLATES.has(ex.template_id) ? 'sprint' : null)
  if (speed !== 'sprint' && speed !== 'max_sprint') return cruise
  const full = settings.sprint_pace_s_per_25?.[ex.discipline] ?? null
  if (full == null) {
    if (cruise != null) notes?.add(`no ${ex.discipline} sprint pace set, sprints timed at cruise pace`)
    return cruise
  }
  if (speed === 'max_sprint' || cruise == null) return full
  return (full + cruise) / 2
}

// Pace is seconds per 25 m by definition, so swim time is distance/25 * pace
// regardless of pool length.
function distanceSeconds(distance_m, rep, ex, settings, notes) {
  const pace = paceFor(rep, ex, settings, notes)
  if (distance_m == null || pace == null) return null
  return (distance_m / 25) * pace
}

function holdSeconds(rep, settings) {
  const t = rep.hold_target
  if (!t) return null
  const lung = rep.lung_volume || 'FL'
  const pb =
    lung === 'RV' ? settings.pbs?.STA_EL : lung === 'FRC' ? settings.pbs?.STA_FRC : settings.pbs?.STA
  switch (t.unit) {
    case 'absolute':
      return t.value ?? null
    case 'pct_pb':
      return pb != null && t.value != null ? pb * (t.value / 100) : null
    case 'contraction_relative': {
      const base = settings.one_c_baseline?.[`STA|${lung}`]
      return base != null ? base + (Number(t.value) || 0) : null
    }
    case 'qualitative': {
      const pct = QUAL_PCT[t.value]
      return pb != null && pct != null ? pb * pct : null
    }
    default:
      return null
  }
}

function distanceMeters(rep, ex, settings, key) {
  const t = rep[key]
  if (!t) return null
  const pb = settings.pbs?.[ex.discipline]
  if (t.unit === 'absolute') return t.value ?? null
  if (t.unit === 'pct_pb') return pb != null && t.value != null ? pb * (t.value / 100) : null
  // A qualitative word the scale knows (max, submax, ...) is a share of PB,
  // as for holds; free text ("long but doable") or computed falls back to
  // the planning distance.
  if (t.unit === 'qualitative' && QUAL_PCT[t.value] != null && pb != null) return pb * QUAL_PCT[t.value]
  return ex.plan_estimate?.distance_m ?? null
}

function effortSeconds(rep, ex, settings, notes) {
  // Tortuga is scored on time, not distance: "cover at most 50 m in the
  // longest possible time", so its PB is a duration and there is no pace to
  // multiply a distance by.
  if (ex.discipline === 'tortuga') return settings.pbs?.tortuga ?? null
  const segs = repSegments(rep.shape ?? 'simple', ex.discipline)
  let total = 0
  for (const seg of segs) {
    if (seg === 'hold') {
      const h = holdSeconds(rep, settings)
      if (h == null) return null
      total += h
    } else if (seg === 'distance' || seg === 'distance2') {
      const key = seg === 'distance2' ? 'distance2_target' : 'distance_target'
      const ds = distanceSeconds(distanceMeters(rep, ex, settings, key), rep, ex, settings, notes)
      if (ds == null) return null
      total += ds
    } else if (seg === 'continuous') {
      // A continuous block is timed by its duration when it has one, else by
      // its distance at the exercise's pace (a hypercapnic surface swim).
      const c = rep.continuous?.duration_s
      if (c != null) {
        total += c
      } else {
        const ds = distanceSeconds(distanceMeters(rep, ex, settings, 'distance_target'), rep, ex, settings, notes)
        if (ds == null) return null
        total += ds
      }
    }
  }
  return total
}

// Rest between sets (ex.recovery_inter): a fixed or capped value, or a feel
// word as a multiple of one rep's time; unset or a rule counts as none.
function interSetSeconds(ex, settings, perRep) {
  const r = ex.recovery_inter
  if (!r) return 0
  const breathS = settings.recovery_breath_s ?? 10
  if (r.type === 'absolute' || r.type === 'cap') {
    if (r.value == null) return 0
    return r.unit === 'breaths' ? r.value * breathS : r.value
  }
  if (r.type === 'qualitative') {
    const m = QUAL_RECOVERY_MULT[r.value]
    return m != null ? m * perRep : 0
  }
  return 0
}

function recoverySeconds(rep, settings, effortSec) {
  const r = rep.recovery
  if (!r) return 0
  const breathS = settings.recovery_breath_s ?? 10
  switch (r.type) {
    case 'absolute':
    case 'cap':
      // Unset recovery counts as none, not as "unknown".
      if (r.value == null) return 0
      return r.unit === 'breaths' ? r.value * breathS : r.value
    case 'inequality':
      // bounded by the swim/hold time (e.g. "≤ swim time").
      return effortSec ?? null
    case 'qualitative': {
      const m = QUAL_RECOVERY_MULT[r.value]
      return m != null && effortSec != null ? m * effortSec : null
    }
    default:
      return null
  }
}

// One pass through the entered reps: prep + effort + recovery for each, plus
// the max-attempt overhead where a rep is one. Also reports the final rep's
// recovery (lastRec) so a single-set exercise can drop the recovery that
// follows its last effort, which leads nowhere, and collects notes (pace
// fallbacks, attempt overhead) for the estimate line.
function blockSeconds(ex, settings) {
  const reps = ex.planned?.reps ?? []
  const notes = new Set()
  const overhead = attemptOverheadSeconds(settings)
  let sum = 0
  let knownCount = 0
  let unknownCount = 0
  let lastRec = 0
  let attempts = 0
  reps.forEach((rep, i) => {
    const prep = rep.prep_breathing?.duration_s ?? 0
    const eff = effortSeconds(rep, ex, settings, notes)
    const rec = recoverySeconds(rep, settings, eff)
    if (eff == null || rec == null) {
      unknownCount++
      return
    }
    sum += prep + eff + rec
    if (isMaxAttempt(rep)) {
      sum += overhead.prep + overhead.recovery
      attempts++
    }
    knownCount++
    if (i === reps.length - 1) lastRec = rec
  })
  if (attempts) {
    const mins = (x) => Math.round(x / 60)
    const who = attempts === 1 ? 'the max attempt' : `${attempts} max attempts`
    notes.add(`incl. ${mins(overhead.prep)} min prep + ${mins(overhead.recovery)} min recovery for ${who}`)
  }
  // perRep averages over the reps we could time, so open-ended / range sets
  // extrapolate from the known ones instead of collapsing on one blank rep.
  return {
    sec: sum,
    knownCount,
    unknownCount,
    perRep: knownCount ? sum / knownCount : 0,
    lastRec,
    notes: [...notes],
  }
}

// Estimate one exercise. Returns { seconds, unestimatedReps, reason, openEnded, notes }:
// seconds is the time of the reps we could estimate (never null; 0 when none),
// plus rest between sets and any rest after the exercise; unestimatedReps
// counts the concrete reps (rep row x sets) we could not time; reason is a
// hint shown when nothing is estimable; openEnded flags an open-ended set
// still missing its expected rep count; notes lists what the number assumes.
export function estimateExercise(ex, settings) {
  const term = ex.termination
  const sets = Math.max(1, ex.set_repeat ?? 1)
  const restAfter = ex.rest_after_s ?? 0

  // Duration-capped (square breathing, timed protocols): the cap is the time.
  if (term?.type === 'duration_capped' && term.duration_s != null) {
    const inter = interSetSeconds(ex, settings, term.duration_s) * (sets - 1)
    return { seconds: term.duration_s * sets + inter + restAfter, unestimatedReps: 0, reason: null, notes: [] }
  }

  const blk = blockSeconds(ex, settings)
  const unknown = blk.unknownCount * sets
  const missing = 'set the PB / pace / baseline or rep targets it needs'
  const withRests = (blockTotal, unestimatedReps, reason, openEnded = false) => ({
    seconds: blockTotal + interSetSeconds(ex, settings, blk.perRep) * (sets - 1) + restAfter,
    unestimatedReps,
    reason,
    openEnded,
    notes: blk.notes,
  })

  // Open-ended sets need an expected rep count to be timed. With a count and at
  // least one timable rep we extrapolate; otherwise we flag the missing input.
  if (term && OPEN_TERMS.has(term.type)) {
    const n = ex.plan_estimate?.reps
    if (n != null && blk.knownCount > 0) return withRests(blk.perRep * n * sets, 0, null)
    const reason = n == null ? 'open-ended: set an expected rep count' : missing
    return withRests(0, unknown, reason, n == null)
  }

  // Range: time the midpoint count from the reps we could estimate.
  if (term?.type === 'range') {
    const lo = term.n_min ?? 1
    const hi = term.n_max ?? lo
    const mid = Math.round((lo + hi) / 2)
    if (blk.knownCount > 0) return withRests(blk.perRep * mid * sets, 0, null)
    return withRests(0, mid * sets, missing)
  }

  // Fixed count: sum the reps we could time (a single set drops the recovery
  // after its last rep, which leads nowhere); reps we could not time are
  // reported as a count rather than zeroing the whole exercise.
  const trailing = sets === 1 ? blk.lastRec : 0
  return withRests(blk.sec * sets - trailing, unknown, blk.knownCount === 0 ? missing : null)
}

// Sum the estimable time across a session and total the reps we could not time.
// openSets counts open-ended exercises still missing an expected rep count, which
// cannot be timed at all (kept separate from the per-rep count).
export function estimateSession(session, settings) {
  let seconds = 0
  let unestimatedReps = 0
  let openSets = 0
  const notes = new Set()
  for (const ex of session.exercises ?? []) {
    const e = estimateExercise(ex, settings)
    seconds += e.seconds || 0
    unestimatedReps += e.unestimatedReps || 0
    if (e.openEnded) openSets++
    for (const n of e.notes ?? []) notes.add(n)
  }
  return { seconds, unestimatedReps, openSets, notes: [...notes] }
}

// Whether an exercise needs a planning estimate input surfaced in the builder.
export function needsPlanningReps(ex) {
  return !!ex.termination && OPEN_TERMS.has(ex.termination.type)
}

export function needsPlanningDistance(ex) {
  const reps = ex.planned?.reps ?? []
  return reps.some((r) => {
    const t = r.distance_target
    return t && (t.unit === 'qualitative' || t.unit === 'computed')
  })
}

export function fmtDuration(sec) {
  if (sec == null) return null
  const m = Math.round(sec / 60)
  if (m < 60) return `~${m} min`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm ? `~${h}h ${mm}m` : `~${h}h`
}
