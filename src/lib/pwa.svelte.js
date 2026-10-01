import { registerSW } from 'virtual:pwa-register'

// Reactive PWA update state. needRefresh flips true when a new service
// worker is waiting; the UI shows a banner and only applies the update
// when the user accepts, so an in-progress capture form is never reloaded
// out from under them.
export const pwa = $state({ needRefresh: false, offlineReady: false })

let updateSW
let registration = null
let lastCheck = 0

// The browser checks for a new service worker only on a fresh start, so an
// installed app resumed from the background would not see an update. Ask
// again whenever the app comes to the front and hourly while it stays there.
const CHECK_MIN_GAP_MS = 60 * 1000
const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function initPWA() {
  updateSW = registerSW({
    onNeedRefresh() {
      pwa.needRefresh = true
    },
    onOfflineReady() {
      pwa.offlineReady = true
    },
    onRegisteredSW(_url, r) {
      registration = r ?? null
    },
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
  setInterval(() => {
    if (document.visibilityState === 'visible') checkForUpdate()
  }, CHECK_INTERVAL_MS)
}

// Throttled; a failed check (offline, server hiccup) waits for the next one.
export function checkForUpdate() {
  if (!registration || pwa.needRefresh || !navigator.onLine) return
  const now = Date.now()
  if (now - lastCheck < CHECK_MIN_GAP_MS) return
  lastCheck = now
  registration.update().catch(() => {})
}

// Accept the waiting worker: skipWaiting + reload. Only call this once the
// user has confirmed and any dirty form state is saved.
export function applyUpdate() {
  pwa.needRefresh = false
  updateSW?.(true)
}
