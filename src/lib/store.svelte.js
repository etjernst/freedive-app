import { getDB, setMeta } from './db.js'
import { seedIfNeeded } from './seed.js'
import { requestPersistence, storageEstimate } from './persist.js'
import { exportToFile, restoreFromFile, buildExport, restoreFromEnvelope, parseExport } from './backup.js'
import { mergeSettings } from './settings.js'
import * as dropbox from './dropbox.js'

// Reactive app state for the shell. The UI reads from here; actions below
// mutate IndexedDB and then refresh() to pull the new truth back out, so the
// database stays the single source of truth and the runes object is a view.
export const app = $state({
  ready: false,
  error: null,
  view: 'home',
  templates: [],
  settings: mergeSettings(null),
  persisted: false,
  usage: null,
  lastExport: null,
  pendingBackup: 0,
  dropbox: { connected: false, busy: false, lastSync: null, error: null, justConnected: false },
})

export function setView(v) {
  app.view = v
}

export async function initApp() {
  try {
    // Complete the OAuth round-trip first if we returned from Dropbox with a
    // code, before anything else touches the URL or storage.
    if (dropbox.pendingCallback()) {
      try {
        await dropbox.completeAuth()
        app.dropbox.justConnected = true
      } catch (e) {
        app.dropbox.error = String(e?.message ?? e)
      }
    }
    app.persisted = await requestPersistence()
    await seedIfNeeded()
    app.dropbox.connected = await dropbox.isConnected()
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
  app.dropbox.lastSync = (await db.get('meta', 'last_dropbox_sync'))?.value ?? null
  app.settings = mergeSettings(await db.get('settings', 'profile'))
}

export async function saveSettings(next) {
  const db = await getDB()
  await db.put('settings', { ...next, key: 'profile' })
  await refresh()
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

// --- Dropbox cloud backup ---------------------------------------------------

// Navigates away to the Dropbox consent screen; control returns via the
// OAuth callback handled in initApp().
export function connectDropbox() {
  return dropbox.beginAuth()
}

export async function disconnectDropbox() {
  await dropbox.disconnect()
  app.dropbox.connected = false
}

export async function syncToDropbox() {
  app.dropbox.busy = true
  app.dropbox.error = null
  try {
    const envelope = await buildExport()
    await dropbox.upload(envelope)
    await setMeta('last_dropbox_sync', envelope.exported_at)
    await refresh()
    return envelope
  } catch (e) {
    app.dropbox.error = String(e?.message ?? e)
  } finally {
    app.dropbox.busy = false
  }
}

export async function restoreFromDropbox() {
  app.dropbox.busy = true
  app.dropbox.error = null
  try {
    const text = await dropbox.downloadLatest()
    if (!text) {
      app.dropbox.error = 'No backup found in Dropbox yet'
      return
    }
    const result = await restoreFromEnvelope(parseExport(text))
    await refresh()
    return result
  } catch (e) {
    app.dropbox.error = String(e?.message ?? e)
  } finally {
    app.dropbox.busy = false
  }
}
