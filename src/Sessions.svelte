<script>
  import { app, createSession, openSession, deleteSession, setView } from './lib/store.svelte.js'

  function fmtDate(d) {
    return d ?? '—'
  }

  function summary(s) {
    const n = s.exercises?.length ?? 0
    return `${n} exercise${n === 1 ? '' : 's'}`
  }

  async function onDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this session? This cannot be undone.')) return
    await deleteSession(id)
  }
</script>

<main>
  <section class="card">
    <div class="actions">
      <button onclick={() => createSession()}>+ New session</button>
      <button onclick={() => createSession('session-log')}>Quick log</button>
    </div>
    <p class="muted center">Quick log skips the plan: enter a past session straight from the actuals.</p>
  </section>

  <section class="card">
    <h2>Sessions</h2>
    {#if app.sessions.length === 0}
      <p class="muted">No sessions yet. Build one from your library.</p>
    {:else}
      <ul class="library">
        {#each app.sessions as s, i (s.id)}
          <li class="session-row" class:is-current={i === 0}>
            <button class="session-open" onclick={() => openSession(s.id, s.status === 'logged' || s.plan_locked ? 'session-log' : 'session-build')}>
              <span class="row-head">
                <span class="name">{fmtDate(s.date)}</span>
                <span class="badge {s.status}">{s.status}</span>
                {#if s.plan_locked}<span class="badge locked" title="Plan locked">🔒</span>{/if}
              </span>
              <span class="tags">{summary(s)}</span>
            </button>
            <button class="row-del link" onclick={(e) => onDelete(e, s.id)} aria-label="Delete session">✕</button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="actions">
    <button class="link" onclick={() => setView('home')}>Back</button>
  </div>
</main>
