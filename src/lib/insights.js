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
