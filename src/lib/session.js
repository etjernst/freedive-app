import { localIso } from './backup.js'
import { fmtMMSS } from './settings.js'

// Session model: a session contains exercises, each carrying a frozen `planned`
// snapshot and, once trained, an `actual` written alongside. The plan is never
// overwritten when the actual is edited; the gap between them is the signal.

export const SESSION_SCHEMA_VERSION = 1

// 'stopped_early_felt_off' predates the bailed-* labels and stays as the
// stored value for "not feeling 100%" so logged sessions keep their meaning.
export const DEVIATION_REASONS = [
  { value: 'completed', label: 'Completed as planned' },
  { value: 'ran_out_of_time', label: 'Ran out of time' },
  { value: 'bailed_too_hard', label: 'Bailed, too hard' },
  { value: 'stopped_early_felt_off', label: 'Bailed, not feeling 100%' },
  { value: 'equipment', label: 'Equipment failure' },
  { value: 'other', label: 'Other' },
]

export const INCIDENTS = [
  { value: 'none', label: 'None' },
  { value: 'samba', label: 'Samba' },
  { value: 'lmc', label: 'LMC' },
  { value: 'bo', label: 'Blackout' },
  { value: 'other', label: 'Other' },
]

export const FEELS = ['great', 'good', 'meh', 'bad', 'terrible']

export const DISCIPLINES = ['STA', 'DYN', 'DYNb', 'DNF', 'tortuga']

// Effort shapes. `simple` resolves to hold or distance from the discipline; the
// rest fix an explicit segment order (see repSegments).
export const SHAPES = [
  { value: 'simple', label: 'Simple (hold or distance)' },
  { value: 'stop-start', label: 'Stop-start (hold then distance)' },
  { value: 'start-stop', label: 'Start-stop (distance then hold)' },
  { value: 'stop-in-the-middle', label: 'Stop-in-the-middle (distance, hold, distance)' },
  { value: 'continuous-protocol', label: 'Continuous protocol' },
]

// Lung-volume and speed option lists, shared by the builder (plan) and the log
// (actual) so both surfaces offer the same choices. RV is empty lung (EL); an
// empty pace value means normal speed (stored as null/absent, never "normal").
export const LUNG_OPTS = [
  { value: 'FL', label: 'full lung' },
  { value: 'FRC', label: 'FRC' },
  { value: 'RV', label: 'empty (EL)' },
]
export const SPEED_OPTS = [
  { value: '', label: 'normal' },
  { value: 'sprint', label: 'sprint' },
  { value: 'max_sprint', label: 'max sprint' },
]

// Short display form of a lung volume; RV reads as EL everywhere in the UI.
export function lungShort(v) {
  return v === 'RV' ? 'EL' : v
}

// Whether a rep list mixes lung volumes (e.g. an alternating FL/EL table).
export function mixedLung(reps) {
  return new Set((reps ?? []).map((r) => r.lung_volume ?? 'FL')).size > 1
}

const DYNAMIC = new Set(['DYN', 'DYNb', 'DNF'])

export function isDynamic(discipline) {
  return DYNAMIC.has(discipline)
}

// Discipline-aware label for the shape picker. The generic "simple" shape reads
// as time for static and distance for dynamic, rather than "hold or distance".
export function shapeLabel(shape, discipline) {
  if (shape === 'simple') {
    return isDynamic(discipline) ? 'Simple (distance)' : 'Simple (time)'
  }
  return SHAPES.find((s) => s.value === shape)?.label ?? shape
}

// Contractions are timed in static but measured by distance in dynamic, so the
// unit follows the discipline (mirrors the first-contraction baselines).
export function contractionUnit(discipline) {
  return isDynamic(discipline) ? 'distance' : 'time'
}

// Wall turns implied by a distance: lengths minus one (50 m in a 25 m pool is
// one turn). Display-only, derived from distance and pool length.
export function turnsFor(distance_m, pool_length_m = 25) {
  if (!distance_m || !pool_length_m) return null
  return Math.max(0, Math.round(distance_m / pool_length_m) - 1)
}

// Ordered segments a rep captures, given its shape and the exercise discipline.
export function repSegments(shape, discipline) {
  switch (shape) {
    case 'stop-start':
      return ['hold', 'distance']
    case 'start-stop':
      return ['distance', 'hold']
    case 'stop-in-the-middle':
      return ['distance', 'hold', 'distance2']
    case 'continuous-protocol':
      return ['continuous']
    case 'simple':
    default:
      return isDynamic(discipline) ? ['distance'] : ['hold']
  }
}

// Plain-language description of what a shape captures, given the discipline.
// Lets "simple" read as "hold time" for static and "distance" for dynamic
// rather than leaving the user to infer it.
export function shapeHint(shape, discipline) {
  const names = {
    hold: 'hold time',
    distance: 'distance',
    distance2: 'second distance',
    continuous: 'one continuous block',
  }
  return repSegments(shape, discipline)
    .map((s) => names[s])
    .join(', then ')
}

export function uid(prefix) {
  const raw =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2)
  return `${prefix}-${raw.slice(0, 10)}`
}

export function todayLocalDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function newSession(pool_length_m = 25) {
  const now = localIso()
  return {
    id: uid('sess'),
    schema_version: SESSION_SCHEMA_VERSION,
    date: todayLocalDate(),
    created_at: now,
    updated_at: now,
    status: 'planned', // -> 'logged' once an actual is saved
    // Where the session happened; drives the turn-count hint in the log.
    // Seeded from the settings default, overridable per session.
    pool_length_m,
    exercises: [],
    session_remarks: '',
    overall_feel: null,
  }
}

// Snapshot a library template into a session exercise. The template's rep block
// becomes the immutable plan; discipline is forced concrete ('any' -> STA, then
// editable in the build view); actual starts empty.
export function instantiateExercise(template, phase = null) {
  // A phase-tagged template (the seals library) carries per-phase reps and,
  // optionally, its own set_repeat / recovery_inter; fall back to the
  // template's own fields when no phase is selected or the template has none.
  const phaseDefaults = phase ? template.phase_defaults?.[phase] : null
  const reps = (phaseDefaults?.reps ?? template.reps ?? []).map((r) => clone(r))
  // 'any' is a template-only placeholder; every 'any' exercise in the library is
  // a dynamic one (the static exercises all carry a concrete STA), so resolve it
  // to a dynamic default the user can change, not STA.
  const discipline =
    template.discipline && template.discipline !== 'any' ? template.discipline : 'DNF'
  return {
    id: uid('ex'),
    template_id: template.id ?? null,
    name: template.name ?? template.id ?? 'Exercise',
    environment: template.environment ?? 'pool',
    role: template.role ?? 'main',
    discipline,
    capacity_tags: template.capacity_tags ?? [],
    goal: template.goal ?? '',
    cues: template.cues ?? '',
    // Free-text instructions the user writes for themselves on this exercise.
    plan_note: template.plan_note ?? '',
    shape_default: template.shape_default ?? 'simple',
    log_mode: template.log_mode ?? 'per_rep',
    set_repeat: phaseDefaults?.set_repeat ?? template.set_repeat ?? 1,
    termination: template.termination ?? { type: 'fixed_n' },
    recovery_intra_default: template.recovery_intra_default ?? null,
    recovery_inter: phaseDefaults?.recovery_inter ?? template.recovery_inter ?? null,
    // wet vs dry, only meaningful for STA; seeded from the template environment.
    medium: template.environment === 'dry' ? 'dry' : 'wet',
    // Which training phase's defaults populated this exercise, if any.
    phase: phase ?? null,
    // Planning hint used only for the time estimate of open-ended/qualitative sets.
    plan_estimate: { reps: null, distance_m: null },
    planned: { reps: reps.length ? reps : [blankRep('simple')] },
    actual: null,
  }
}

// Re-use an exercise from a past session: deep-copy its plan into a fresh
// exercise (new id, actual cleared), so a previously filled-in rep block can be
// dropped into a new session without re-entering it. The source exercise is
// left untouched.
export function reuseExercise(ex) {
  const copy = clone(ex)
  copy.id = uid('ex')
  copy.actual = null
  return copy
}

export function blankExercise() {
  return {
    id: uid('ex'),
    template_id: null,
    name: 'Ad-hoc exercise',
    environment: 'pool',
    role: 'main',
    discipline: 'STA',
    capacity_tags: [],
    goal: '',
    cues: '',
    plan_note: '',
    shape_default: 'simple',
    log_mode: 'per_rep',
    set_repeat: 1,
    termination: { type: 'fixed_n' },
    recovery_intra_default: null,
    recovery_inter: null,
    medium: 'wet',
    plan_estimate: { reps: null, distance_m: null },
    planned: { reps: [blankRep('simple')] },
    actual: null,
  }
}

export function blankRep(shape = 'simple') {
  return { shape }
}

export function newTemplateId() {
  return uid('tmpl')
}

// Build a reusable library template from a session exercise: keep its plan and
// metadata, drop the per-instance actual, ids, and day-specific note. The field
// set mirrors the seeded templates so it validates against the same schema.
export function exerciseToTemplate(ex, name) {
  return {
    schema_version: 1,
    id: newTemplateId(),
    name: name || ex.name || 'New exercise',
    environment: ex.environment ?? 'pool',
    role: ex.role ?? 'main',
    discipline: ex.discipline ?? 'STA',
    capacity_tags: clone(ex.capacity_tags ?? []),
    goal: ex.goal ?? '',
    cues: ex.cues ?? '',
    log_mode: ex.log_mode ?? 'per_rep',
    set_repeat: ex.set_repeat ?? 1,
    termination: clone(ex.termination ?? { type: 'fixed_n' }),
    reps: clone(ex.planned?.reps ?? [{ shape: 'simple' }]),
  }
}

// The plan slots to log against: the rep block repeated set_repeat times. Each
// slot keeps a plan_index back to its planned rep so the log leaf can show the
// planned target beside the realized number. Until-failure / progressive sets
// add or drop rows during logging, so this is a starting scaffold, not a cap.
export function expandPlannedSlots(exercise) {
  const reps = exercise.planned?.reps ?? []
  const k = Math.max(1, exercise.set_repeat ?? 1)
  const slots = []
  for (let set = 0; set < k; set++) {
    reps.forEach((rep, i) => slots.push({ plan_index: i, set, rep }))
  }
  return slots
}

// The single source of truth for "how many reps were planned": the listed rep
// rows times the outer set repeat. `termination` never carries a count (a
// fixed_n has no n), so this is the only count formula; expandPlannedSlots agrees.
export function plannedRepCount(exercise) {
  const reps = exercise.planned?.reps?.length ?? 0
  return reps * Math.max(1, exercise.set_repeat ?? 1)
}

export function blankActualRep(plan_index = null) {
  return {
    plan_index,
    new_pb: false,
    lung_volume: 'FL',
    pace: null,
    hold_s: null,
    distance_m: null,
    distance2_m: null,
    dive_time_s: null,
    duration_s: null, // continuous-protocol realized total
    turns: null,
    recovery_value: null,
    recovery_unit: null,
    contraction_value: null,
    contraction_unit: null,
    stroke_count: null,
    hr_high: null,
    hr_low: null,
    spo2_nadir: null,
    incident: 'none',
    incident_note: '',
    prep_pattern: '',
    prep_duration_s: null,
    note: '',
  }
}

export function seedActual(exercise) {
  const base = {
    physical_rpe: null,
    mental_rpe: null,
    deviation_reason: 'completed',
    remarks: '',
  }
  // Aggregate "lap set" exercises (sweet-16) log one summary, not rep by rep.
  if (exercise.log_mode === 'aggregate') {
    return { ...base, aggregate: blankAggregate(exercise) }
  }
  return {
    ...base,
    // Seed realized values the plan already fixes (lung volume, pace, absolute
    // holds and distances, a set recovery), so logging an as-planned rep needs
    // no typing; every seeded field stays editable to record a deviation.
    // Relative or qualitative targets (% PB, 1C+X, "submax") and cap
    // recoveries carry no set number, so those are not seeded.
    reps: expandPlannedSlots(exercise).map((s) => {
      const ar = blankActualRep(s.plan_index)
      ar.lung_volume = s.rep?.lung_volume ?? 'FL'
      ar.pace = s.rep?.pace ?? null
      if (s.rep?.hold_target?.unit === 'absolute' && s.rep.hold_target.value != null) {
        ar.hold_s = s.rep.hold_target.value
      }
      if (s.rep?.distance_target?.unit === 'absolute' && s.rep.distance_target.value != null) {
        ar.distance_m = s.rep.distance_target.value
      }
      if (s.rep?.distance2_target?.unit === 'absolute' && s.rep.distance2_target.value != null) {
        ar.distance2_m = s.rep.distance2_target.value
      }
      const rec = s.rep?.recovery
      if (rec?.type === 'absolute' && rec.value != null) {
        ar.recovery_value = rec.value
        ar.recovery_unit = rec.unit === 'breaths' ? 'breaths' : 'time'
      }
      return ar
    }),
  }
}

// Empty summary for an aggregate lap set: lap distance seeded from the planned
// rep (else 25 m), rep count from the planned count (16 for sweet-16). Pace and
// total distance are derived from these, never stored (see aggregatePace).
export function blankAggregate(exercise) {
  const d = exercise.planned?.reps?.[0]?.distance_target
  const lap = d?.unit === 'absolute' && d.value != null ? d.value : 25
  return { lap_distance_m: lap, total_time_s: null, n_reps: plannedRepCount(exercise) }
}

// Derived readout for an aggregate set: pace per lap (total / reps), pace
// normalized to 25 m, and total distance. Returns null until time and reps exist.
export function aggregatePace(agg) {
  if (!agg || !agg.total_time_s || !agg.n_reps) return null
  const perLap = agg.total_time_s / agg.n_reps
  const lap = agg.lap_distance_m
  return {
    perLap,
    per25: lap ? perLap * (25 / lap) : null,
    totalDist: (lap ?? 0) * agg.n_reps,
  }
}

// Plain deep clone for JSON-shaped documents; also strips Svelte state proxies.
export function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

const QUAL_LABELS = {
  first_discomfort: 'to first discomfort',
  submax: 'sub-max',
  strong_submax: 'strong sub-max',
  max: 'max',
  close_to_max: 'close to max',
}

// One-line descriptions of a planned target, for showing the plan beside the
// realized number in the log leaf.
export function describeHold(t) {
  if (!t) return '—'
  switch (t.unit) {
    case 'absolute':
      return fmtMMSS(t.value)
    case 'pct_pb':
      return `${t.value}% PB`
    case 'contraction_relative':
      return t.value ? `1C +${t.value}s` : 'until 1C'
    case 'qualitative':
      return QUAL_LABELS[t.value] ?? String(t.value)
    default:
      return String(t.value ?? '—')
  }
}

export function describeDistance(t) {
  if (!t) return '—'
  switch (t.unit) {
    case 'absolute':
      return `${t.value} m`
    case 'pct_pb':
      return `${t.value}% PB`
    case 'qualitative':
      return String(t.value)
    case 'computed':
      return 'computed'
    default:
      return String(t.value ?? '—')
  }
}

export function describeRecovery(r) {
  if (!r) return '—'
  const fmt = (v) => (r.unit === 'breaths' ? `${v} breaths` : fmtMMSS(v))
  switch (r.type) {
    case 'qualitative':
    case 'inequality':
      return String(r.value)
    case 'cap':
      return `≤ ${fmt(r.value)}`
    default:
      return r.value != null ? fmt(r.value) : '—'
  }
}

// One planned rep as a single compact line: its phases joined, then lung volume
// (omitted when full lung, unless the exercise mixes volumes), pace (when set),
// and the recovery that follows. The
// trailing recovery of a single-set exercise is dropped (it leads nowhere).
// Shared by the in-app plan overview and the Obsidian export so the two never
// drift; RV reads as EL, matching the log view's context line.
export function planRepLine(rep, ex, isLast) {
  const segs = repSegments(rep.shape ?? 'simple', ex.discipline)
  const parts = []
  for (const seg of segs) {
    if (seg === 'hold') parts.push(describeHold(rep.hold_target))
    else if (seg === 'distance') parts.push(describeDistance(rep.distance_target))
    else if (seg === 'distance2') parts.push(describeDistance(rep.distance2_target))
    else if (seg === 'continuous') {
      const c = rep.continuous ?? {}
      const bits = []
      if (rep.distance_target) bits.push(describeDistance(rep.distance_target))
      if (c.duration_s) bits.push(fmtMMSS(c.duration_s))
      bits.push(c.pattern || c.stroke_cadence || 'continuous')
      parts.push(bits.join(' '))
    }
  }
  let line = parts.filter(Boolean).join(' → ') || '—'
  // FL is the unstated default (an unset volume reads as FL), except in a
  // mixed-volume exercise (an alternating FL/EL table) where every rep names
  // its volume.
  const lung = rep.lung_volume ?? 'FL'
  if (lung !== 'FL' || mixedLung(ex.planned?.reps)) {
    line += ` · ${lungShort(lung)}`
  }
  if (rep.pace) line += ` · ${rep.pace.replace('_', ' ')}`
  const showRec = rep.recovery && !((ex.set_repeat ?? 1) <= 1 && isLast)
  if (showRec) {
    const r = describeRecovery(rep.recovery)
    if (r && r !== '—') line += ` · rec ${r}`
  }
  return line
}

// Compact read-only plan summary for the log view: one entry per exercise with
// its planned rep lines and note. Display only; nothing here is persisted.
export function planOverview(session) {
  return (session.exercises ?? []).map((ex) => {
    const reps = ex.planned?.reps ?? []
    return {
      id: ex.id,
      name: ex.name,
      discipline: ex.discipline,
      sets: ex.set_repeat ?? 1,
      lines: reps.map((r, i) => planRepLine(r, ex, i === reps.length - 1)),
      note: ex.plan_note ?? '',
    }
  })
}
