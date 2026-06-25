// Ask the browser to mark our storage persistent so IndexedDB is not evicted
// under storage pressure. Idempotent: if already persisted, report that
// without re-prompting. Returns the granted boolean.
export async function requestPersistence() {
  if (!navigator.storage) return false
  let persisted = navigator.storage.persisted
    ? await navigator.storage.persisted()
    : false
  if (!persisted && navigator.storage.persist) {
    persisted = await navigator.storage.persist()
  }
  return persisted
}

// Best-effort usage/quota for the data-safety surface. Null when the browser
// does not expose StorageManager.estimate.
export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null
  const { usage, quota } = await navigator.storage.estimate()
  return { usage, quota }
}
