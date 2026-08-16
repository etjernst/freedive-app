// Shared exercise-library presentation: the discipline filter and ordering used
// by both the Home library card and the session builder's add-from-library list.

// The 18 'any' templates are the dynamic exercises (usable across DYN/DYNb/DNF),
// so they group under one "Dynamic" chip rather than faking separate buckets.
const DYNAMIC_DISC = new Set(['any', 'DYN', 'DYNb', 'DNF'])

export const LIB_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'STA', label: 'STA' },
  { key: 'dynamic', label: 'Dynamic' },
  { key: 'tortuga', label: 'Tortuga' },
]

// Second filter axis: the capacity a template trains (schema `capacity_tags`).
// A template matches when any of its tags equals the chosen key; null = no filter.
export const CAPACITY_FILTERS = [
  { key: 'co2', label: 'CO2' },
  { key: 'o2_hypoxia', label: 'O2' },
  { key: 'mental', label: 'Mental' },
  { key: 'volume', label: 'Volume' },
  { key: 'technique', label: 'Technique' },
  { key: 'fitness_lactic', label: 'Fitness' },
  { key: 'performance', label: 'Performance' },
]

const ROLE_ORDER = { warmup: 0, main: 1, cooldown: 2 }

export function matchesFilter(t, key) {
  if (key === 'all') return true
  if (key === 'dynamic') return DYNAMIC_DISC.has(t.discipline)
  return t.discipline === key
}

export function matchesCapacity(t, key) {
  if (!key) return true
  return (t.capacity_tags ?? []).includes(key)
}

// Filtered on both axes, then ordered warm-up -> main -> cool-down, then by
// name, so a filtered list reads top-to-bottom the way a session is assembled.
export function filterLibrary(templates, key, capacity = null) {
  return templates
    .filter((t) => matchesFilter(t, key) && matchesCapacity(t, capacity))
    .slice()
    .sort(
      (a, b) =>
        (ROLE_ORDER[a.role] ?? 1) - (ROLE_ORDER[b.role] ?? 1) ||
        (a.name ?? '').localeCompare(b.name ?? ''),
    )
}

export const discLabel = (d) => (d === 'any' ? 'dynamic' : d)

export const roleLabel = (r) =>
  r === 'warmup' ? 'warm-up' : r === 'cooldown' ? 'cool-down' : null
