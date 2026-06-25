import { getMeta, setMeta } from './db.js'

// Public PKCE client: only the app key is embedded, never a secret (a static
// PWA cannot keep one). App-folder scoped, so every path below is relative to
// the dedicated Winnow folder and a leaked token reaches nothing else.
const APP_KEY = 'whmh5y596zhp52e'

const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize'
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token'
const API = 'https://api.dropboxapi.com/2'
const CONTENT = 'https://content.dropboxapi.com/2'

const PKCE_KEY = 'winnow_dbx_pkce' // sessionStorage, survives the redirect
const FILE_PREFIX = 'winnow-'
const KEEP_LAST = 20 // versioned exports retained in the folder

// Must string-match a redirect URI registered in the Dropbox console. Derived
// from the live origin so the same build works on localhost (dev) and the
// custom domain (prod) without a hardcoded host.
function redirectUri() {
  return window.location.origin + import.meta.env.BASE_URL
}

// --- PKCE helpers -----------------------------------------------------------

function base64url(bytes) {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(nBytes = 64) {
  return base64url(crypto.getRandomValues(new Uint8Array(nBytes)))
}

async function s256(verifier) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )
  return base64url(new Uint8Array(digest))
}

// --- OAuth ------------------------------------------------------------------

// Build the authorize URL plus the verifier/state to stash. Separated from
// beginAuth so it can be unit-tested without navigating away.
export async function buildAuthUrl() {
  const verifier = randomString()
  const state = randomString(16)
  const params = new URLSearchParams({
    client_id: APP_KEY,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge: await s256(verifier),
    code_challenge_method: 'S256',
    // offline is what makes Dropbox return a refresh_token, so the user
    // authorizes once rather than every few hours.
    token_access_type: 'offline',
    state,
  })
  return { url: `${AUTH_URL}?${params}`, verifier, state }
}

export async function beginAuth() {
  const { url, verifier, state } = await buildAuthUrl()
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }))
  window.location.assign(url)
}

export function pendingCallback() {
  const u = new URL(window.location.href)
  return u.searchParams.has('code') && u.searchParams.has('state')
}

function cleanUrl() {
  const u = new URL(window.location.href)
  u.search = ''
  window.history.replaceState({}, '', u.toString())
}

// Exchange the authorization code for tokens. Cleans the URL first so a page
// refresh can never replay a spent code. Verifies state to block CSRF.
export async function completeAuth() {
  const u = new URL(window.location.href)
  const code = u.searchParams.get('code')
  const state = u.searchParams.get('state')
  const stash = JSON.parse(sessionStorage.getItem(PKCE_KEY) || 'null')
  cleanUrl()
  sessionStorage.removeItem(PKCE_KEY)

  if (!stash || stash.state !== state) throw new Error('OAuth state mismatch')

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
    client_id: APP_KEY,
    code_verifier: stash.verifier,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
  }
  const tok = await res.json()
  if (!tok.refresh_token) {
    throw new Error('No refresh_token (check token_access_type=offline)')
  }
  await setMeta('dropbox', {
    refresh_token: tok.refresh_token,
    access_token: tok.access_token,
    expires_at: Date.now() + (tok.expires_in ?? 14400) * 1000,
    account_id: tok.account_id,
  })
  return true
}

export async function isConnected() {
  return Boolean((await getMeta('dropbox'))?.refresh_token)
}

export async function disconnect() {
  const t = await getMeta('dropbox')
  if (t?.access_token) {
    // Best-effort revoke; a network failure here must not block local disconnect.
    try {
      await fetch(`${API}/auth/token/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t.access_token}` },
      })
    } catch {
      /* ignore */
    }
  }
  await setMeta('dropbox', null)
}

// --- authenticated requests -------------------------------------------------

// Return a valid access token, refreshing via the refresh_token when the
// cached one is within 60s of expiry or when forced after a 401.
async function accessToken(force = false) {
  const t = await getMeta('dropbox')
  if (!t?.refresh_token) throw new Error('Not connected to Dropbox')
  if (!force && t.access_token && t.expires_at - 60000 > Date.now()) {
    return t.access_token
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: t.refresh_token,
    client_id: APP_KEY,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const tok = await res.json()
  await setMeta('dropbox', {
    ...t,
    access_token: tok.access_token,
    expires_at: Date.now() + (tok.expires_in ?? 14400) * 1000,
  })
  return tok.access_token
}

// One transparent retry on 401 expired_access_token: force a refresh and
// replay the request once.
async function dbxFetch(url, { headers = {}, ...opts } = {}) {
  let token = await accessToken()
  let res = await fetch(url, {
    ...opts,
    headers: { ...headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    token = await accessToken(true)
    res = await fetch(url, {
      ...opts,
      headers: { ...headers, Authorization: `Bearer ${token}` },
    })
  }
  return res
}

// --- export files -----------------------------------------------------------

function fileName(iso) {
  const stamp = iso.replace(/:/g, '-').replace(/\.\d+/, '')
  return `${FILE_PREFIX}${stamp}.json`
}

// Given folder entries newest-first, return the ones beyond the keep window.
function selectForPruning(files, keep = KEEP_LAST) {
  return files.slice(keep)
}

async function listExports() {
  const res = await dbxFetch(`${API}/files/list_folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '' }),
  })
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  const data = await res.json()
  return data.entries
    .filter((e) => e['.tag'] === 'file' && e.name.startsWith(FILE_PREFIX))
    .sort((a, b) => (a.name < b.name ? 1 : -1)) // timestamped names sort by time
}

async function prune() {
  const stale = selectForPruning(await listExports())
  for (const f of stale) {
    await dbxFetch(`${API}/files/delete_v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: f.path_lower }),
    })
  }
  return stale.length
}

// Upload one export envelope as a new timestamped file, then prune to the
// keep window. autorename guards the rare same-second collision.
export async function upload(envelope) {
  const path = '/' + fileName(envelope.exported_at)
  const res = await dbxFetch(`${CONTENT}/files/upload`, {
    method: 'POST',
    headers: {
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'add',
        autorename: true,
        mute: true,
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: JSON.stringify(envelope),
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`)
  await prune()
  return path
}

// Download the newest export as raw text (the caller validates and restores).
// Null when the folder holds no Winnow export yet.
export async function downloadLatest() {
  const files = await listExports()
  if (!files.length) return null
  const res = await dbxFetch(`${CONTENT}/files/download`, {
    method: 'POST',
    headers: { 'Dropbox-API-Arg': JSON.stringify({ path: files[0].path_lower }) },
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return res.text()
}

// Exposed for unit tests only.
export const _internals = { s256, fileName, selectForPruning, dbxFetch, redirectUri }
