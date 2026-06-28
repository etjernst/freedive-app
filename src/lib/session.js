import { localIso } from './backup.js'
import { fmtMMSS } from './settings.js'

// Session model: a session contains exercises, each carrying a frozen `planned`
// snapshot and, once trained, an `actual` written alongside. The plan is never
// overwritten when the actual is edited; the gap between them is the signal.

export const SESSION_SCHEMA_VERSION = 1

export const DEVIATION_REASONS = [
  { value: 'completed', label: 'Completed as planned' },
  { value: 'ran_out_of_time', label: 'Ran out of time' },
  { value: 'stopped_early_felt_off', label: 'Stopped early — felt off' },
  { value: 'equipment', label: 'Equipment' },
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

function uid(prefix) {
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

export function newSession() {
  const now = localIso()
  return {
    id: uid('sess'),
    schema_version: SESSION_SCHEMA_VERSION,
    date: todayLocalDate(),
    created_at: now,
    updated_at: now,
    status: 'planned', // -> 'logged' once an actual is saved
    exercises: [],
    session_remarks: '',
    overall_feel: null,
  }
}

// Snapshot a library template into a session exercise. The template's rep block
// becomes the immutable plan; discipline is forced concrete ('any' -> STA, then
// editable in the build view); actual starts empty.
export function instantiateExercise(template) {
  const reps = (template.reps ?? []).map((r) => clone(r))
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
    set_repeat: template.set_repeat ?? 1,
    termination: template.termination ?? { type: 'fixed_n', n: 1 },
    recovery_intra_default: template.recovery_intra_default ?? null,
    recovery_inter: template.recovery_inter ?? null,
    // wet vs dry, only meaningful for STA; seeded from the template environment.
    medium: template.environment === 'dry' ? 'dry' : 'wet',
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
    set_repeat: 1,
    termination: { type: 'fixed_n', n: 1 },
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
    set_repeat: ex.set_repeat ?? 1,
    termination: clone(ex.termination ?? { type: 'fixed_n', n: 1 }),
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

export function blankActualRep(plan_index = null) {
  return {
    plan_index,
    new_pb: false,
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
  return {
    physical_rpe: null,
    mental_rpe: null,
    deviation_reason: 'completed',
    remarks: '',
    reps: expandPlannedSlots(exercise).map((s) => blankActualRep(s.plan_index)),
  }
}

// Plain deep clone for JSON-shaped documents; also strips Svelte state proxies.
export function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

const QUAL_LABELS = {
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
  const u = r.unit === 'breaths' ? ' breaths' : 's'
  switch (r.type) {
    case 'qualitative':
    case 'inequality':
      return String(r.value)
    case 'cap':
      return `≤ ${r.value}${u}`
    default:
      return r.value != null ? `${r.value}${u}` : '—'
  }
}
