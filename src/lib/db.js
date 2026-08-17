import { openDB } from 'idb'
import { IS_SEALS } from './edition.js'

// Both editions can be served from the same GitHub Pages origin, so the DB
// name is what keeps their data apart.
const DB_NAME = IS_SEALS ? 'winnow-seals' : 'winnow'

// IndexedDB structural version: bump only when the object stores or indexes
// below change shape. Distinct from DATA_SCHEMA_VERSION, which versions the
// CONTENT of records and drives migrate-on-read at the application layer.
const DB_VERSION = 2

export const DATA_SCHEMA_VERSION = 1

// Every store the app persists. Export and restore walk this list, so a new
// store is backed up the moment it is added here.
export const STORES = [
  'meta',
  'templates',
  'sessions',
  'goals',
  'settings',
  'fc_store',
  'outbox',
  'measurements',
]

let dbPromise

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('goals')) {
          db.createObjectStore('goals', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('fc_store')) {
          // First-contraction times, bucketed by discipline x lung volume so
          // the rolling average can be queried per bucket.
          const fc = db.createObjectStore('fc_store', { keyPath: 'id' })
          fc.createIndex('bucket', 'bucket')
        }
        if (!db.objectStoreNames.contains('outbox')) {
          // Pending sync items. `status` index lets the sync engine pull the
          // queued/failed rows without scanning the whole store.
          const ob = db.createObjectStore('outbox', { keyPath: 'id' })
          ob.createIndex('status', 'status')
        }
        if (!db.objectStoreNames.contains('measurements')) {
          // Dated body measurements (vital capacity first), stored as a time
          // series keyed by `type` so readings can be trended, never overwritten.
          db.createObjectStore('measurements', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

// Small meta helpers: the meta store holds single-value app flags keyed by
// name (seeded, schema_version, last_export, last_dropbox_sync...).
export async function getMeta(key) {
  const row = await (await getDB()).get('meta', key)
  return row?.value
}

export async function setMeta(key, value) {
  await (await getDB()).put('meta', { key, value })
}
