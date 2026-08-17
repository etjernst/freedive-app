import fixtures from '$fixtures'
import { getDB, getMeta, setMeta, DATA_SCHEMA_VERSION } from './db.js'

// Merge the shipped exercise library into IndexedDB on every load, additively:
// any shipped template whose id is not already stored gets added, so exercises
// we add to fixtures.json later show up automatically on the next app start.
// Existing templates are never overwritten, so a template the user has edited
// (or one we've since changed) is left exactly as it is. Updating already-seeded
// templates in place is intentionally NOT done here; that needs per-template
// "user edited?" tracking and is a separate change. Returns what happened.
export async function seedIfNeeded() {
  const templates = fixtures.templates ?? []
  const db = await getDB()
  const existing = new Set(await db.getAllKeys('templates'))
  const toAdd = templates.filter((t) => !existing.has(t.id))

  if (toAdd.length) {
    const tx = db.transaction('templates', 'readwrite')
    for (const t of toAdd) tx.store.put(t)
    await tx.done
  }

  const firstRun = !(await getMeta('seeded'))
  if (firstRun) {
    await setMeta('seeded', true)
    await setMeta('schema_version', DATA_SCHEMA_VERSION)
  }
  return { seeded: firstRun, added: toAdd.length }
}
