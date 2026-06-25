import { getDB, getMeta, STORES, DATA_SCHEMA_VERSION } from './db.js'

const EXPORT_FORMAT = 'winnow-export'

// Gather every store into one versioned envelope. `schema_version` lets a
// future import run migrate-on-read; `exported_at` is provenance and names
// the file. The Dropbox adapter will reuse this same envelope, so export and
// restore share one contract across both backup targets.
export async function buildExport() {
  const db = await getDB()
  const data = {}
  for (const store of STORES) data[store] = await db.getAll(store)
  return {
    format: EXPORT_FORMAT,
    schema_version: (await getMeta('schema_version')) ?? DATA_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    data,
  }
}

// Filesystem-safe, sortable name: winnow-2026-06-26T08-50-00.json. Colons and
// fractional seconds are stripped so the file lands cleanly on every OS and
// timestamped exports sort chronologically.
export function exportFilename(envelope) {
  const stamp = envelope.exported_at.replace(/:/g, '-').replace(/\.\d+/, '')
  return `winnow-${stamp}.json`
}

// Local-file backup adapter: download the envelope. Always available, no auth,
// and the zero-setup fallback for the Dropbox path.
export async function exportToFile() {
  const envelope = await buildExport()
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFilename(envelope)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return envelope
}

export function parseExport(text) {
  const envelope = JSON.parse(text)
  if (envelope?.format !== EXPORT_FORMAT || typeof envelope.data !== 'object') {
    throw new Error('Not a Winnow export file')
  }
  return envelope
}

// Restore replaces local data wholesale from an envelope: clear each store
// present in the export, then rehydrate it. This is both the device-migration
// path and the rehydrate-from-latest-Dropbox-export recovery path. Stores
// absent from the envelope are left untouched.
export async function restoreFromEnvelope(envelope) {
  const stores = STORES.filter((s) => Array.isArray(envelope.data?.[s]))
  const db = await getDB()
  const tx = db.transaction(stores, 'readwrite')
  for (const store of stores) {
    const os = tx.objectStore(store)
    await os.clear()
    for (const row of envelope.data[store]) os.put(row)
  }
  await tx.done
  return {
    stores,
    counts: Object.fromEntries(stores.map((s) => [s, envelope.data[s].length])),
  }
}

export async function restoreFromFile(file) {
  return restoreFromEnvelope(parseExport(await file.text()))
}
