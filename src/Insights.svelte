<script>
  import { app, setView } from './lib/store.svelte.js'
  import { collectStaHolds, summarize } from './lib/insights.js'
  import { fmtMMSS } from './lib/settings.js'

  const all = $derived(collectStaHolds(app.sessions))
  const max = $derived(collectStaHolds(app.sessions, { maxOnly: true }))
  const rows = $derived([
    { label: 'Max attempts', wet: summarize(max.wet), dry: summarize(max.dry) },
    { label: 'All static holds', wet: summarize(all.wet), dry: summarize(all.dry) },
  ])
  const hasData = $derived(rows.some((r) => r.wet.n || r.dry.n))

  const dash = (s) => fmtMMSS(s) || '—'
</script>

<main>
  <section class="card">
    <h2>Wet vs dry (static)</h2>
    <p class="muted">Best and average hold by medium, from your logged static sessions.</p>
  </section>

  {#if !hasData}
    <section class="card">
      <p class="muted center">
        No static holds logged yet. Tag a static exercise wet or dry in the builder, log its
        actuals, and the comparison shows up here.
      </p>
    </section>
  {:else}
    {#each rows as row (row.label)}
      <section class="card">
        <h2>{row.label}</h2>
        {#if !row.wet.n && !row.dry.n}
          <p class="muted">None logged.</p>
        {:else}
          <div class="cmp">
            <div class="cmp-col">
              <div class="cmp-head">Wet</div>
              <div class="cmp-best">{dash(row.wet.best)}</div>
              <div class="muted">best · avg {dash(row.wet.avg)} · n {row.wet.n}</div>
            </div>
            <div class="cmp-col">
              <div class="cmp-head">Dry</div>
              <div class="cmp-best">{dash(row.dry.best)}</div>
              <div class="muted">best · avg {dash(row.dry.avg)} · n {row.dry.n}</div>
            </div>
          </div>
        {/if}
      </section>
    {/each}
  {/if}

  <div class="actions">
    <button class="link" onclick={() => setView('home')}>Back</button>
  </div>
</main>
