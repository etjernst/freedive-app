import { getDB, setMeta } from './db.js'
import fixtures from '../../seed/fixtures.json'
import { seedIfNeeded } from './seed.js'
import { requestPersistence, storageEstimate } from './persist.js'
import { exportToFile, restoreFromFile, buildExport, restoreFromEnvelope, parseExport, localIso } from './backup.js'
import { mergeSettings } from './settings.js'
import { newSession, instantiateExercise, clone } from './session.js'
import * as dropbox from './dropbox.js'

// Reactive app state for the shell. The UI reads from here; actions below
// mutate IndexedDB and then refresh() to pull the new truth back out, so the
// database stays the single source of truth and the runes object is a view.
export const app = $state({
  ready: false,
  error: null,
  view: 'home',
  templates: [],
  sessions: [],
  currentSessionId: null,
  settings: mergeSettings(null),
  persisted: false,
  usage: null,
  lastExport: null,
  pendingBackup: 0,
  autoBackup: false,
  dropbox: { connected: false, busy: false, lastSync: null, error: null, justConnected: false },
  exitHint: false,
})

// In-memory trail of views for hardware-back navigation (see backnav.js).
// Bounded so a marathon session cannot grow it without limit.
const viewTrail = []

export function setView(v) {
  if (v === app.view) return
  viewTrail.push(app.view)
  if (viewTrail.length > 50) viewTrail.shift()
  app.view = v
}

// Step back to the previously shown view. Returns false when the trail is
// empty, i.e. the user is at their entry view and back should mean "exit".
export function popView() {
  const prev = viewTrail.pop()
  if (!prev) return false
  app.view = prev
  return true
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
    // A debounced auto-backup still pending when the app is backgrounded would
    // be lost if the PWA is then killed, so flush it immediately on hide.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushAutoBackup()
    })
    app.ready = true
  } catch (e) {
    app.error = String(e?.message ?? e)
  }
}

export async function refresh() {
  const db = await getDB()
  app.templates = await db.getAll('templates')
  // Newest training day first; created_at breaks same-day ties.
  app.sessions = (await db.getAll('sessions')).sort(
    (a, b) =>
      (b.date ?? '').localeCompare(a.date ?? '') ||
      (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  )
  app.usage = await storageEstimate()
  app.lastExport = (await db.get('meta', 'last_export'))?.value ?? null
  app.pendingBackup = await db.count('outbox')
  app.dropbox.lastSync = (await db.get('meta', 'last_dropbox_sync'))?.value ?? null
  app.autoBackup = (await db.get('meta', 'auto_backup'))?.value ?? false
  app.settings = mergeSettings(await db.get('settings', 'profile'))
}

// --- Auto-backup ------------------------------------------------------------

// Debounce so a burst of edits produces one upload, not many. syncToDropbox
// already swallows failures into app.dropbox.error, so a flaky connection can
// never block or interrupt logging.
const AUTO_BACKUP_DEBOUNCE_MS = 5000
let autoBackupTimer = null

function queueAutoBackup() {
  if (!app.autoBackup || !app.dropbox.connected) return
  clearTimeout(autoBackupTimer)
  autoBackupTimer = setTimeout(runAutoBackup, AUTO_BACKUP_DEBOUNCE_MS)
}

function runAutoBackup() {
  autoBackupTimer = null
  // A manual sync in flight already uploads the current state; re-queue
  // instead of racing it with a second upload.
  if (app.dropbox.busy) return queueAutoBackup()
  syncToDropbox()
}

function flushAutoBackup() {
  if (autoBackupTimer == null) return
  clearTimeout(autoBackupTimer)
  runAutoBackup()
}

export async function setAutoBackup(on) {
  await setMeta('auto_backup', Boolean(on))
  app.autoBackup = Boolean(on)
  // Turning it on counts as "there is unsynced state": back up right away so
  // the toggle's effect is visible without waiting for the next save.
  if (on) queueAutoBackup()
}

// Overwrite the shipped canon templates with the latest fixtures (by id), so
// edits we make to the library reach an already-seeded device. Templates whose
// id is NOT in fixtures (the user's own saved/ad-hoc ones) are left untouched.
export async function refreshLibrary() {
  const db = await getDB()
  const shipped = fixtures.templates ?? []
  const tx = db.transaction('templates', 'readwrite')
  for (const t of shipped) tx.store.put(t)
  await tx.done
  await refresh()
  return shipped.length
}

export async function saveSettings(next) {
  const db = await getDB()
  await db.put('settings', { ...next, key: 'profile' })
  await refresh()
  queueAutoBackup()
}

// --- Sessions ---------------------------------------------------------------

export function currentSession() {
  return app.sessions.find((s) => s.id === app.currentSessionId) ?? null
}

export async function createSession(view = 'session-build') {
  const s = newSession()
  await (await getDB()).put('sessions', s)
  app.currentSessionId = s.id
  await refresh()
  setView(view)
}

// Start a fresh planned session seeded with one library exercise, then jump to
// the builder. Mirrors createSession() but pre-adds the chosen template so a
// tap on a Home library card lands in a buildable session.
export async function startSessionWith(templateId) {
  const s = newSession()
  const t = app.templates.find((x) => x.id === templateId)
  // instantiateExercise reads from the $state-proxied template, so clone the
  // assembled session to strip proxies before IndexedDB structured-clones it.
  if (t) s.exercises = [instantiateExercise(t)]
  await (await getDB()).put('sessions', clone(s))
  app.currentSessionId = s.id
  await refresh()
  setView('session-build')
}

export function openSession(id, view = 'session-build') {
  app.currentSessionId = id
  setView(view)
}

export async function saveSession(session) {
  // Plain-clone at the persistence boundary: a Svelte $state proxy cannot be
  // structured-cloned into IndexedDB, and session documents are JSON-shaped, so
  // this both strips the proxy and guarantees the put is cloneable.
  const doc = clone(session)
  doc.updated_at = localIso()
  await (await getDB()).put('sessions', doc)
  await refresh()
  queueAutoBackup()
}

// Save a user-authored template to the library (a fresh id, never overwriting).
// Clone at the boundary to strip $state proxies, as saveSession does.
export async function saveTemplate(template) {
  await (await getDB()).put('templates', clone(template))
  await refresh()
  queueAutoBackup()
}

export async function deleteSession(id) {
  await (await getDB()).delete('sessions', id)
  if (app.currentSessionId === id) app.currentSessionId = null
  await refresh()
  queueAutoBackup()
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
