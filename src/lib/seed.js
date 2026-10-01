import fixtures from '$fixtures'
import { getDB, getMeta, setMeta, DATA_SCHEMA_VERSION } from './db.js'

// Bring the shipped exercise library into IndexedDB on every load. Built-in
// exercises missing from the device are added. When the shipped library has
// changed since it was last written here (an app update, or a restore of an
// older backup), every built-in exercise is overwritten by id with the shipped
// version. Exercises the user saved carry their own ids, so they are never
// touched. Returns what happened.
const FINGERPRINT_KEY = 'library_fingerprint'

// 32-bit FNV-1a over the library JSON: cheap, and any edit changes it.
function fingerprint(templates) {
  const text = JSON.stringify(templates)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

export async function seedIfNeeded() {
  const templates = fixtures.templates ?? []
  const db = await getDB()
  const print = fingerprint(templates)
  const changed = (await getMeta(FINGERPRINT_KEY)) !== print
  const existing = new Set(await db.getAllKeys('templates'))
  const toWrite = changed ? templates : templates.filter((t) => !existing.has(t.id))

  if (toWrite.length) {
    const tx = db.transaction('templates', 'readwrite')
    for (const t of toWrite) tx.store.put(t)
    await tx.done
  }
  if (changed) await setMeta(FINGERPRINT_KEY, print)

  const firstRun = !(await getMeta('seeded'))
  if (firstRun) {
    await setMeta('seeded', true)
    await setMeta('schema_version', DATA_SCHEMA_VERSION)
  }
  return { seeded: firstRun, written: toWrite.length, refreshed: changed }
}
