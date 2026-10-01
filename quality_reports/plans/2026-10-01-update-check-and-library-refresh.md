# Plan: prompt update check and automatic library refresh (2026-10-01)

Spec: [2026-10-01-update-check-and-library-refresh.md](../specs/2026-10-01-update-check-and-library-refresh.md).
Emilia approved both changes in chat on 2026-10-01.

## Steps

1. `src/lib/pwa.svelte.js`: keep the registration from `onRegisteredSW`; add `checkForUpdate()`, which calls `registration.update()` at most once a minute and swallows failures; call it on `visibilitychange` to visible and on an hourly interval.
2. `src/lib/seed.js`: fingerprint `fixtures.templates` (32-bit FNV-1a over the JSON); when the stored `library_fingerprint` meta differs, put every shipped template, then store the fingerprint; otherwise keep the additive behavior.
3. `src/lib/store.svelte.js`: run `seedIfNeeded()` after `doRestore` and `restoreFromDropbox`, before `refresh()`.
4. Verify in Chrome on `vite preview`: a device whose stored "Technique drills" is altered and whose fingerprint is stale gets the shipped version back on reload; an unchanged fingerprint leaves the store alone; after a rebuild, switching back to the tab shows the update banner; `npm run build` and `npm run build:seals` succeed.
5. Commit; push only when Emilia says so.
