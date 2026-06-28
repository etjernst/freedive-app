import fixtures from '../../seed/fixtures.json'

// Co-occurrence affinities shipped with the seed: pairs of exercises that
// appeared together in the same source session. Used to suggest "goes well
// with" exercises while building a session.
export const AFFINITIES = fixtures.affinities ?? []

// Given the template ids already in the draft, rank candidate exercises by how
// strongly they co-occurred with them, excluding ones already added. Returns
// up to `limit` suggestions with their display name and accumulated weight.
export function suggestionsFor(addedIds, templates, limit = 4) {
  const added = new Set(addedIds)
  if (added.size === 0) return []

  const weights = new Map()
  for (const a of AFFINITIES) {
    const [x, y] = a.exercises
    const xIn = added.has(x)
    const yIn = added.has(y)
    if (xIn === yIn) continue // both present or both absent: not a suggestion
    const candidate = xIn ? y : x
    if (added.has(candidate)) continue
    weights.set(candidate, (weights.get(candidate) ?? 0) + (a.weight ?? 1))
  }

  const byId = new Map(templates.map((t) => [t.id, t]))
  return [...weights.entries()]
    .filter(([id]) => byId.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, w]) => ({ id, name: byId.get(id).name, weight: w }))
}
