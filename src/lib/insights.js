// Aggregations over logged sessions. Pure functions so they're easy to reason
// about and test; the view just renders what these return.

// Collect realized static hold times (seconds), split by wet/dry medium.
// maxOnly restricts to max-attempt exercises (template sta-max), which is the
// cleanest like-for-like comparison of conditions.
export function collectStaHolds(sessions, { maxOnly = false } = {}) {
  const out = { wet: [], dry: [] }
  for (const s of sessions ?? []) {
    for (const ex of s.exercises ?? []) {
      if (ex.discipline !== 'STA') continue
      if (maxOnly && ex.template_id !== 'sta-max') continue
      const medium = ex.medium === 'dry' ? 'dry' : 'wet'
      for (const r of ex.actual?.reps ?? []) {
        const v = r.hold_s
        if (typeof v === 'number' && v > 0) out[medium].push(v)
      }
    }
  }
  return out
}

export function summarize(vals) {
  if (!vals?.length) return { n: 0, best: null, avg: null }
  const sum = vals.reduce((a, b) => a + b, 0)
  return { n: vals.length, best: Math.max(...vals), avg: Math.round(sum / vals.length) }
}
