<script>
  import { pwa, applyUpdate } from './lib/pwa.svelte.js'
  import {
    app,
    doExport,
    doRestore,
    connectDropbox,
    disconnectDropbox,
    syncToDropbox,
    restoreFromDropbox,
  } from './lib/store.svelte.js'

  let busy = $state(null)
  let notice = $state(null)

  async function onExport() {
    busy = 'export'
    try {
      const env = await doExport()
      notice = `Exported ${env.data.templates.length} templates`
    } catch (e) {
      notice = `Export failed: ${e?.message ?? e}`
    } finally {
      busy = null
    }
  }

  async function onRestoreFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (!confirm('Restore replaces all local data with this file. Continue?')) return
    busy = 'restore'
    try {
      const result = await doRestore(file)
      notice = `Restored ${result.counts.templates ?? 0} templates`
    } catch (e) {
      notice = `Restore failed: ${e?.message ?? e}`
    } finally {
      busy = null
    }
  }

  function fmtBytes(n) {
    if (n == null) return '—'
    const mb = n / (1024 * 1024)
    return mb < 1 ? `${Math.round(n / 1024)} KB` : `${mb.toFixed(1)} MB`
  }

  function fmtDate(iso) {
    if (!iso) return 'never'
    return iso.replace('T', ' ').replace(/:\d\d\.\d+Z$/, '')
  }

  async function onRestoreDropbox() {
    if (!confirm('Restore replaces all local data with the latest Dropbox backup. Continue?')) return
    await restoreFromDropbox()
  }
</script>

<div class="splash" aria-hidden="true">
  <div class="splash-inner">
    <div class="wordmark">Winnow</div>
    <p class="mantra">No quick decisions</p>
  </div>
</div>

{#if pwa.needRefresh}
  <div class="banner" role="status">
    <span>A new version is ready.</span>
    <button onclick={applyUpdate}>Update</button>
  </div>
{/if}

<header>
  <h1>Winnow</h1>
  <p class="tagline">Capture, tracking, and coaching</p>
</header>

<main>
  {#if app.error}
    <section class="card error">
      <h2>Storage error</h2>
      <p>{app.error}</p>
    </section>
  {/if}

  <section class="card">
    <h2>Backup</h2>
    <dl class="status">
      <dt>Persistent storage</dt>
      <dd>{app.persisted ? 'granted' : 'not granted'}</dd>
      <dt>Storage used</dt>
      <dd>{fmtBytes(app.usage?.usage)}</dd>
      <dt>Last export</dt>
      <dd>{fmtDate(app.lastExport)}</dd>
      <dt>Not backed up</dt>
      <dd>{app.pendingBackup} item{app.pendingBackup === 1 ? '' : 's'}</dd>
    </dl>
    <div class="actions">
      <button onclick={onExport} disabled={!app.ready || busy}>
        {busy === 'export' ? 'Exporting…' : 'Export to file'}
      </button>
      <label class="file-btn" class:disabled={!app.ready || busy}>
        {busy === 'restore' ? 'Restoring…' : 'Restore from file'}
        <input
          type="file"
          accept="application/json,.json"
          onchange={onRestoreFile}
          disabled={!app.ready || busy}
        />
      </label>
    </div>
    {#if notice}<p class="notice">{notice}</p>{/if}
  </section>

  <section class="card">
    <h2>Cloud backup (Dropbox)</h2>
    {#if app.dropbox.connected}
      <dl class="status">
        <dt>Status</dt>
        <dd>connected</dd>
        <dt>Last sync</dt>
        <dd>{fmtDate(app.dropbox.lastSync)}</dd>
      </dl>
      <div class="actions">
        <button onclick={syncToDropbox} disabled={app.dropbox.busy}>
          {app.dropbox.busy ? 'Working…' : 'Back up now'}
        </button>
        <button onclick={onRestoreDropbox} disabled={app.dropbox.busy}>
          Restore from Dropbox
        </button>
      </div>
      <div class="actions">
        <button class="link" onclick={disconnectDropbox} disabled={app.dropbox.busy}>
          Disconnect
        </button>
      </div>
    {:else}
      <p class="muted">Auto-back up your log to a private Dropbox app folder.</p>
      <div class="actions">
        <button onclick={connectDropbox}>Connect Dropbox</button>
      </div>
    {/if}
    {#if app.dropbox.error}<p class="notice err">{app.dropbox.error}</p>{/if}
    {#if app.dropbox.justConnected}<p class="notice">Connected to Dropbox</p>{/if}
  </section>

  <section class="card">
    <h2>Exercise library</h2>
    <p class="muted">{app.templates.length} templates in your library</p>
    <ul class="library">
      {#each app.templates as t (t.id)}
        <li>
          <span class="name">{t.name ?? t.id}</span>
          {#if t.capacity_tags}
            <span class="tags">{t.capacity_tags.join(' · ')}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <p class="phase-note">Phase 1 — storage and backup. Capture and calendar to come.</p>
</main>
