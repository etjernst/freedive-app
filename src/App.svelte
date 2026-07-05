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
    setView,
    createSession,
    startSessionWith,
  } from './lib/store.svelte.js'
  import { LIB_FILTERS, filterLibrary, discLabel, roleLabel } from './lib/library.js'
  import logoUrl from './assets/winnow_logo.svg'
  import Settings from './Settings.svelte'
  import Sessions from './Sessions.svelte'
  import SessionBuild from './SessionBuild.svelte'
  import SessionLog from './SessionLog.svelte'
  import Insights from './Insights.svelte'

  const TITLES = {
    home: { h1: 'Winnow', tag: 'Capture, tracking, and coaching' },
    settings: { h1: 'Settings', tag: 'Personal bests, pace, and training baselines' },
    sessions: { h1: 'Sessions', tag: 'Build, log, and review your training' },
    'session-build': { h1: 'Build session', tag: 'Assemble the plan from your library' },
    'session-log': { h1: 'Log session', tag: 'Fill the actuals against your plan' },
    stats: { h1: 'Insights', tag: 'What your logged training shows' },
  }
  const head = $derived(TITLES[app.view] ?? TITLES.home)

  let libFilter = $state('all')
  const libTemplates = $derived(filterLibrary(app.templates, libFilter))

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
    // 2026-06-26T10:09:23+10:00 (or an older ...Z) -> 2026-06-26 10:09
    const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
    return m ? `${m[1]} ${m[2]}` : iso
  }

  async function onRestoreDropbox() {
    if (!confirm('Restore replaces all local data with the latest Dropbox backup. Continue?')) return
    await restoreFromDropbox()
  }
</script>

<div class="splash" aria-hidden="true">
  <div class="splash-inner">
    <img class="splash-logo" src={logoUrl} alt="" />
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

{#if app.exitHint}
  <div class="banner" role="status">
    <span>Press back again to exit.</span>
  </div>
{/if}

<header>
  <div class="title">
    <h1>{head.h1}</h1>
    <p class="tagline">{head.tag}</p>
  </div>
  <nav>
    {#if app.view === 'home'}
      <button class="link" onclick={() => setView('sessions')}>Sessions</button>
      <button class="link" onclick={() => setView('settings')}>Settings</button>
    {:else}
      <button class="link" onclick={() => setView('home')}>Home</button>
    {/if}
  </nav>
</header>

{#if app.view === 'settings'}
  <Settings />
{:else if app.view === 'sessions'}
  <Sessions />
{:else if app.view === 'session-build'}
  <SessionBuild />
{:else if app.view === 'session-log'}
  <SessionLog />
{:else if app.view === 'stats'}
  <Insights />
{:else}
  <main>
    {#if app.error}
      <section class="card error">
        <h2>Storage error</h2>
        <p>{app.error}</p>
      </section>
    {/if}

    <section class="card">
      <h2>Training</h2>
      <p class="muted">{app.sessions.length} session{app.sessions.length === 1 ? '' : 's'} logged or planned</p>
      <div class="actions">
        <button onclick={() => createSession()}>New session</button>
        <button onclick={() => setView('sessions')}>Open sessions</button>
        <button class="link" onclick={() => setView('stats')}>Insights</button>
      </div>
    </section>

    <section class="card">
      <h2>Exercise library</h2>
      <p class="muted">{app.templates.length} templates · tap one to start a session</p>
      <div class="filters">
        {#each LIB_FILTERS as f (f.key)}
          <button class="chip" class:active={libFilter === f.key} onclick={() => (libFilter = f.key)}>
            {f.label}
          </button>
        {/each}
      </div>
      <div class="lib-list">
        {#each libTemplates as t (t.id)}
          <button class="lib-card" onclick={() => startSessionWith(t.id)}>
            <span class="lib-top">
              <span class="name">{t.name ?? t.id}</span>
              <span class="badges">
                <span class="disc">{discLabel(t.discipline)}</span>
                {#if roleLabel(t.role)}<span class="role">{roleLabel(t.role)}</span>{/if}
              </span>
            </span>
            {#if t.capacity_tags?.length}
              <span class="tags">{t.capacity_tags.join(' · ')}</span>
            {/if}
            {#if t.goal}<span class="lib-goal muted">{t.goal}</span>{/if}
          </button>
        {/each}
        {#if libTemplates.length === 0}
          <p class="muted">No exercises match this filter.</p>
        {/if}
      </div>
    </section>

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

    <p class="phase-note">Phase 2a — capture. Calendar and capacities to come.</p>
  </main>
{/if}
