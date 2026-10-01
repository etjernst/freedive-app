# Spec: prompt update check and automatic library refresh (2026-10-01)

Scope: `freedive-app`, both editions.

## Problem

The "A new version is ready" banner depends on the browser's own service-worker update check, which runs when the app starts from scratch, not when Emilia switches back to an app left open in the background.
Updates therefore reach her phone late.
Separately, the built-in exercise library on a device changes only through the Settings "refresh library" button: `seedIfNeeded()` adds new built-in exercises but never updates ones already stored.
Her phone kept the one-rep "Technique drills" for two months after the twelve-rep version shipped on 26 July.

## MUST

- M1 The app asks the service worker registration for an update whenever the app becomes visible, and on a timer while it stays visible, throttled so it checks at most once a minute; a failed check (offline) is silent.
- M2 The existing banner and the Update button stay the only way an update is applied; nothing reloads the page on its own.
- M3 On start, when the shipped library differs from the one last written to the device, every built-in exercise is overwritten by id with the shipped version; the device records a fingerprint of the shipped library so an unchanged library is not rewritten.
- M4 Exercises Emilia saved herself keep their ids (`newTemplateId()`), so M3 never touches them.
- M5 A restore (file or Dropbox) runs the same check afterwards, so a backup made on an older version does not bring back stale built-in exercises.

## Decided against

Real push notifications: they need a push server and the app has none.

## Out of scope

Removing built-in exercises that the library no longer ships; the Settings "refresh library" button stays as it is.
