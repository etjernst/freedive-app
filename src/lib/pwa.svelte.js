import { registerSW } from 'virtual:pwa-register'

// Reactive PWA update state. needRefresh flips true when a new service
// worker is waiting; the UI shows a banner and only applies the update
// when the user accepts, so an in-progress capture form is never reloaded
// out from under them.
export const pwa = $state({ needRefresh: false, offlineReady: false })

let updateSW

export function initPWA() {
  updateSW = registerSW({
    onNeedRefresh() {
      pwa.needRefresh = true
    },
    onOfflineReady() {
      pwa.offlineReady = true
    },
  })
}

// Accept the waiting worker: skipWaiting + reload. Only call this once the
// user has confirmed and any dirty form state is saved.
export function applyUpdate() {
  pwa.needRefresh = false
  updateSW?.(true)
}
