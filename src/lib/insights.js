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

// Per-exercise rep history: one row per logged instance of the exercise,
// oldest first. Each row carries the per-rep hold times (index kept, so a
// skipped rep leaves a gap in the dot plot) and the headline metric for the
// CO2 tables: total time under hold. Prototype for the per-exercise insight;
// a metric registry over all templates comes once each exercise has one.
export function exerciseRepHistory(sessions, templateId) {
  const rows = []
  for (const s of sessions ?? []) {
    for (const ex of s.exercises ?? []) {
      if (ex.template_id !== templateId) continue
      const points = (ex.actual?.reps ?? [])
        .map((r, i) => ({ rep: i + 1, v: r.hold_s }))
        .filter((p) => typeof p.v === 'number' && p.v > 0)
      if (!points.length) continue
      rows.push({
        date: s.date,
        total: points.reduce((a, p) => a + p.v, 0),
        points,
      })
    }
  }
  // Oldest first so legend order and color assignment read chronologically.
  rows.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  return rows
}

// Fixed categorical order for chart series (sessions), validated against the
// light card surface (#f6f2e8): lightness band, chroma floor, CVD separation,
// contrast. Assigned oldest-first, never cycled: past six instances, fold the
// oldest into gray rather than generating new hues.
export const SERIES_COLORS = ['#5f8323', '#2f6ba8', '#c04a33', '#8c4bb0', '#b07a16']

export function summarize(vals) {
  if (!vals?.length) return { n: 0, best: null, avg: null }
  const sum = vals.reduce((a, b) => a + b, 0)
  return { n: vals.length, best: Math.max(...vals), avg: Math.round(sum / vals.length) }
}

function bestResult(ex, key) {
  const vals = (ex.actual?.reps ?? []).map((r) => r[key]).filter((v) => typeof v === 'number' && v > 0)
  return vals.length ? Math.max(...vals) : null
}

// Attribute each logged max attempt to the warm-up that preceded it in the
// session, then rank warm-ups by the max they yield. "Preceded it" means the
// most recent warm-up-role exercise before the max, falling back to the
// exercise immediately before it (which catches warm-ups like the EL/FL switch
// that carry a 'main' role but were used to warm up). Returns rows sorted by
// best result descending. discipline 'STA' compares hold time; otherwise distance.
export function maxByWarmup(sessions, { discipline = 'STA' } = {}) {
  const maxId = discipline === 'STA' ? 'sta-max' : 'dyn-max'
  const key = discipline === 'STA' ? 'hold_s' : 'distance_m'
  const groups = new Map()
  for (const s of sessions ?? []) {
    let lastWarmup = null
    let prev = null
    for (const ex of s.exercises ?? []) {
      if (ex.template_id === maxId) {
        const lead = lastWarmup ?? prev
        const v = bestResult(ex, key)
        if (lead && v != null) {
          const k = lead.template_id || lead.name || 'unknown'
          if (!groups.has(k)) groups.set(k, { name: lead.name || k, values: [] })
          groups.get(k).values.push(v)
        }
      }
      if (ex.role === 'warmup') lastWarmup = ex
      prev = ex
    }
  }
  return [...groups.values()]
    .map((g) => ({ name: g.name, ...summarize(g.values) }))
    .sort((a, b) => (b.best ?? 0) - (a.best ?? 0))
}
