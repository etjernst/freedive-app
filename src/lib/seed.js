import fixtures from '../../seed/fixtures.json'
import { getDB, getMeta, setMeta, DATA_SCHEMA_VERSION } from './db.js'

// Load the shipped exercise library into IndexedDB once, on first run. The
// `seeded` meta flag guards re-import: once the user edits a template or adds
// their own, a later app load must not overwrite their library with the
// fixtures again. Returns whether a seed actually happened.
export async function seedIfNeeded() {
  if (await getMeta('seeded')) return { seeded: false }

  const templates = fixtures.templates ?? []
  const db = await getDB()
  const tx = db.transaction('templates', 'readwrite')
  for (const t of templates) tx.store.put(t)
  await tx.done

  await setMeta('seeded', true)
  await setMeta('schema_version', DATA_SCHEMA_VERSION)
  return { seeded: true, count: templates.length }
}
