// The single settings/profile document, stored under key 'profile' in the
// settings store. Times are seconds; distances meters; volumes liters; pace
// is seconds per 25 m (STA has no pace). null means "not set yet".
export const DEFAULT_SETTINGS = {
  key: 'profile',
  // Personal bests. STA is a hold time (seconds); the rest are distances (m).
  pbs: { STA: null, DNF: null, DYN: null, DYNb: null },
  pace_s_per_25: { DNF: null, DYN: null, DYNb: null },
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
    '3 big breaths': 'soft',
  },
}

// The first-contraction buckets surfaced in the settings form. FRC is omitted
// as rare; add-as-needed rather than showing every discipline x lung combo.
// unit drives the input: 'time' (mm:ss, seconds) or 'distance' (meters).
export const ONE_C_BUCKETS = [
  { key: 'STA|FL', label: 'STA, full lungs', unit: 'time' },
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
    pool_length_m: s.pool_length_m ?? DEFAULT_SETTINGS.pool_length_m,
    spirometer: { ...DEFAULT_SETTINGS.spirometer, ...(s.spirometer ?? {}) },
    one_c_baseline: { ...(s.one_c_baseline ?? {}) },
    breathing_intensity: s.breathing_intensity
      ? { ...s.breathing_intensity }
      : { ...DEFAULT_SETTINGS.breathing_intensity },
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
