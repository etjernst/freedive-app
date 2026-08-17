// The single settings/profile document, stored under key 'profile' in the
// settings store. Times are seconds; distances meters; volumes liters; pace
// is seconds per 25 m (STA has no pace). null means "not set yet".
export const DEFAULT_SETTINGS = {
  key: 'profile',
  // Personal bests, keyed by PB_FIELDS below. Times in seconds, distances in
  // meters; the unit per key lives in PB_FIELDS so the form parses each right.
  pbs: {
    STA: null,
    STA_NWU: null,
    STA_MOVE: null,
    STA_FRC: null,
    STA_EL: null,
    DNF: null,
    DNF_FRC: null,
    DNF_EL: null,
    DYN: null,
    DYN_FRC: null,
    DYN_EL: null,
    DYNb: null,
    DYNb_FRC: null,
    DYNb_EL: null,
    tortuga: null,
    sweet16_DNF: null,
    sweet16_DYNb: null,
    sweet16_DYN: null,
  },
  pace_s_per_25: { DNF: null, DYN: null, DYNb: null },
  // Full-sprint pace per dynamic discipline (a 'sprint' rep swims at the
  // midpoint between this and cruise), and a single surface-swim pace for
  // hypercapnic swims. Both seconds per 25 m.
  sprint_pace_s_per_25: { DNF: null, DYN: null, DYNb: null },
  swim_pace_s_per_25: null,
  // Seconds a single recovery breath takes, for breath-counted recoveries.
  recovery_breath_s: 10,
  // Time the estimate adds around a max attempt (a rep whose target is the
  // qualitative max or close-to-max): preparation before, recovery after.
  attempt_prep_s: 300,
  attempt_recovery_s: 300,
  pool_length_m: 25,
  spirometer: { vital_capacity_l: null, packed_l: null },
  // Cold-start first-contraction baseline, keyed "DISCIPLINE|LUNG", until
  // enough history exists for the rolling average to take over. The value's
  // unit follows the discipline: seconds for static, meters for dynamic,
  // because contractions are timed in STA but measured by distance in DYN/DNF.
  one_c_baseline: {},
  // Breathing pattern -> prep intensity, read by the analysis layer so Emilia
  // enters only duration + pattern. Seeded from her own decoding. Distinct
  // patterns may share an intensity (e.g. square and tidal both read neutral);
  // the raw pattern is still stored per rep, so nothing is lost.
  breathing_intensity: {
    '2:2': 'very_strong',
    '3:3': 'very_strong',
    '5:5': 'strong',
    '4:6': 'soft',
    square: 'neutral',
    tidal: 'neutral',
    '3 big breaths': 'neutral',
  },
  // Which profile the session-builder time estimate reads: the signed-in
  // user's own numbers, or the template student below.
  estimate_for: 'me', // 'me' | 'student'
  // A representative "template student" profile, so a coach can time a
  // session before anyone has entered their own personal bests.
  template_student: {
    label: 'Template student',
    pbs: { DYNb: 100, tortuga: 90 },
    pace_s_per_25: { DYNb: 25 },
    sprint_pace_s_per_25: { DYNb: 17.5 },
    swim_pace_s_per_25: 40,
    recovery_breath_s: 10,
  },
}

// Personal-best fields surfaced in the settings form, in display order. `unit`
// drives the input: 'time' (mm:ss, seconds) or 'distance' (meters). STA bests
// and the named tests (tortuga, the sweet-16 sprint) are times; the bare
// discipline maxes are distances. `group` renders a subheading whenever it
// changes from the previous field, so the 18 fields read as discipline blocks.
export const PB_FIELDS = [
  { key: 'STA_NWU', label: 'No-warm-up max (FL)', unit: 'time', group: 'STA' },
  { key: 'STA', label: 'Max full lung', unit: 'time', group: 'STA' },
  { key: 'STA_MOVE', label: 'Max with movement', unit: 'time', group: 'STA' },
  { key: 'STA_FRC', label: 'FRC max', unit: 'time', group: 'STA' },
  { key: 'STA_EL', label: 'Empty lung (EL) max', unit: 'time', group: 'STA' },
  { key: 'DNF', label: 'Max full lung', unit: 'distance', group: 'DNF' },
  { key: 'DNF_FRC', label: 'FRC max', unit: 'distance', group: 'DNF' },
  { key: 'DNF_EL', label: 'Empty lung max', unit: 'distance', group: 'DNF' },
  { key: 'sweet16_DNF', label: 'Sweet 16 (16×25)', unit: 'time', group: 'DNF' },
  { key: 'DYN', label: 'Max full lung', unit: 'distance', group: 'DYN (monofin)' },
  { key: 'DYN_FRC', label: 'FRC max', unit: 'distance', group: 'DYN (monofin)' },
  { key: 'DYN_EL', label: 'Empty lung max', unit: 'distance', group: 'DYN (monofin)' },
  { key: 'sweet16_DYN', label: 'Sweet 16 (16×25)', unit: 'time', group: 'DYN (monofin)' },
  { key: 'DYNb', label: 'Max full lung', unit: 'distance', group: 'DYNb (bifins)' },
  { key: 'DYNb_FRC', label: 'FRC max', unit: 'distance', group: 'DYNb (bifins)' },
  { key: 'DYNb_EL', label: 'Empty lung max', unit: 'distance', group: 'DYNb (bifins)' },
  { key: 'sweet16_DYNb', label: 'Sweet 16 (16×25)', unit: 'time', group: 'DYNb (bifins)' },
  { key: 'tortuga', label: 'Tortuga', unit: 'time', group: 'Tests' },
]

// The first-contraction buckets surfaced in the settings form. Dynamic FRC/EL
// combos are omitted as rare; add-as-needed rather than showing every
// discipline x lung combo. unit drives the input: 'time' or 'distance'.
export const ONE_C_BUCKETS = [
  { key: 'STA|FL', label: 'STA, full lungs', unit: 'time' },
  { key: 'STA|FRC', label: 'STA, functional residual (FRC)', unit: 'time' },
  { key: 'STA|RV', label: 'STA, residual volume (EL)', unit: 'time' },
  { key: 'DNF|FL', label: 'DNF, full lungs', unit: 'distance' },
  { key: 'DNF|RV', label: 'DNF, residual volume (EL)', unit: 'distance' },
  { key: 'DYN|FL', label: 'DYN, full lungs', unit: 'distance' },
  { key: 'DYNb|FL', label: 'DYNb, full lungs', unit: 'distance' },
]

export const INTENSITIES = ['very_strong', 'strong', 'soft', 'neutral']

// Deep-merge stored settings over the defaults so a partial or older document
// still yields a fully-populated form.
export function mergeSettings(stored) {
  const s = stored ?? {}
  return {
    key: 'profile',
    pbs: { ...DEFAULT_SETTINGS.pbs, ...(s.pbs ?? {}) },
    pace_s_per_25: { ...DEFAULT_SETTINGS.pace_s_per_25, ...(s.pace_s_per_25 ?? {}) },
    sprint_pace_s_per_25: { ...DEFAULT_SETTINGS.sprint_pace_s_per_25, ...(s.sprint_pace_s_per_25 ?? {}) },
    swim_pace_s_per_25: s.swim_pace_s_per_25 ?? null,
    recovery_breath_s: s.recovery_breath_s ?? DEFAULT_SETTINGS.recovery_breath_s,
    attempt_prep_s: s.attempt_prep_s ?? DEFAULT_SETTINGS.attempt_prep_s,
    attempt_recovery_s: s.attempt_recovery_s ?? DEFAULT_SETTINGS.attempt_recovery_s,
    pool_length_m: s.pool_length_m ?? DEFAULT_SETTINGS.pool_length_m,
    spirometer: { ...DEFAULT_SETTINGS.spirometer, ...(s.spirometer ?? {}) },
    one_c_baseline: { ...(s.one_c_baseline ?? {}) },
    breathing_intensity: s.breathing_intensity
      ? { ...s.breathing_intensity }
      : { ...DEFAULT_SETTINGS.breathing_intensity },
    estimate_for: s.estimate_for === 'student' ? 'student' : 'me',
    template_student: {
      ...DEFAULT_SETTINGS.template_student,
      ...(s.template_student ?? {}),
      pbs: { ...DEFAULT_SETTINGS.template_student.pbs, ...(s.template_student?.pbs ?? {}) },
      pace_s_per_25: {
        ...DEFAULT_SETTINGS.template_student.pace_s_per_25,
        ...(s.template_student?.pace_s_per_25 ?? {}),
      },
      sprint_pace_s_per_25: {
        ...DEFAULT_SETTINGS.template_student.sprint_pace_s_per_25,
        ...(s.template_student?.sprint_pace_s_per_25 ?? {}),
      },
    },
  }
}

// The settings object the estimator should read: the user's own profile as
// stored, or the template-student profile layered over it when
// estimate_for === 'student' (student paces replace the user's; PBs merge on
// top so an unset student PB still falls back to the user's own).
export function estimateSettings(settings) {
  if (settings.estimate_for !== 'student') return settings
  const ts = settings.template_student
  return {
    ...settings,
    pbs: { ...settings.pbs, ...ts.pbs },
    pace_s_per_25: { ...ts.pace_s_per_25 },
    sprint_pace_s_per_25: { ...ts.sprint_pace_s_per_25 },
    swim_pace_s_per_25: ts.swim_pace_s_per_25,
    recovery_breath_s: ts.recovery_breath_s,
  }
}

// "6:00" or "360" -> 360 seconds. Blank -> null.
export function parseMMSS(str) {
  if (str == null || String(str).trim() === '') return null
  const s = String(str).trim()
  if (s.includes(':')) {
    const [m, sec] = s.split(':')
    return Number(m) * 60 + Number(sec || 0)
  }
  return Number(s)
}

// Timer-style entry helper for the mobile numeric keypad, which has no ":".
// Digit-only text of 3+ chars gets a colon before the last two digits
// ("230" -> "2:30"); shorter digit runs and text with ":" pass through.
export function autoColon(raw) {
  const s = String(raw ?? '')
  const digits = s.replace(/\D/g, '')
  if (s.includes(':') || digits.length < 3) return s
  return `${digits.slice(0, -2)}:${digits.slice(-2)}`
}

export function fmtMMSS(sec) {
  if (sec == null || sec === '') return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Plain numeric field: blank -> null, otherwise a finite number or null.
export function numOrNull(v) {
  if (v == null || String(v).trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
