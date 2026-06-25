import { getDB, setMeta } from './db.js'
import { seedIfNeeded } from './seed.js'
import { requestPersistence, storageEstimate } from './persist.js'
import { exportToFile, restoreFromFile } from './backup.js'

// Reactive app state for the shell. The UI reads from here; actions below
// mutate IndexedDB and then refresh() to pull the new truth back out, so the
// database stays the single source of truth and the runes object is a view.
export const app = $state({
  ready: false,
  error: null,
  templates: [],
  persisted: false,
  usage: null,
  lastExport: null,
  pendingBackup: 0,
})

export async function initApp() {
  try {
    app.persisted = await requestPersistence()
    await seedIfNeeded()
    await refresh()
    app.ready = true
  } catch (e) {
    app.error = String(e?.message ?? e)
  }
}

export async function refresh() {
  const db = await getDB()
  app.templates = await db.getAll('templates')
  app.usage = await storageEstimate()
  app.lastExport = (await db.get('meta', 'last_export'))?.value ?? null
  app.pendingBackup = await db.count('outbox')
}

export async function doExport() {
  const envelope = await exportToFile()
  await setMeta('last_export', envelope.exported_at)
  await refresh()
  return envelope
}

export async function doRestore(file) {
  const result = await restoreFromFile(file)
  await refresh()
  return result
}
