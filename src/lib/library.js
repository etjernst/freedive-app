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

const ROLE_ORDER = { warmup: 0, main: 1, cooldown: 2 }

export function matchesFilter(t, key) {
  if (key === 'all') return true
  if (key === 'dynamic') return DYNAMIC_DISC.has(t.discipline)
  return t.discipline === key
}

// Filtered, then ordered warm-up -> main -> cool-down, then by name, so a filtered
// list reads top-to-bottom the way a session is assembled.
export function filterLibrary(templates, key) {
  return templates
    .filter((t) => matchesFilter(t, key))
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
