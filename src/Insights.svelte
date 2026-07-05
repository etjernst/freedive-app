<script>
  import { app, setView } from './lib/store.svelte.js'
  import {
    collectStaHolds,
    summarize,
    maxByWarmup,
    exerciseRepHistory,
    SERIES_COLORS,
  } from './lib/insights.js'
  import { fmtMMSS } from './lib/settings.js'
  import RepDotPlot from './lib/RepDotPlot.svelte'

  const all = $derived(collectStaHolds(app.sessions))
  const max = $derived(collectStaHolds(app.sessions, { maxOnly: true }))
  const rows = $derived([
    { label: 'Max attempts', wet: summarize(max.wet), dry: summarize(max.dry) },
    { label: 'All static holds', wet: summarize(all.wet), dry: summarize(all.dry) },
  ])
  const warmupRows = $derived(maxByWarmup(app.sessions, { discipline: 'STA' }))
  const hasData = $derived(rows.some((r) => r.wet.n || r.dry.n) || warmupRows.length > 0)

  // Per-exercise history prototype: the V-shaped CO2 table. Headline metric is
  // total time under hold; the dot plot shows each rep. Only the most recent
  // five instances get a series color, so hues are never cycled.
  const vshapeAll = $derived(exerciseRepHistory(app.sessions, 'sta-co2-vshape'))
  const vshape = $derived(vshapeAll.slice(-SERIES_COLORS.length))
  const vshapeSeries = $derived(
    vshape.map((r, i, arr) => ({
      label: arr.filter((x) => x.date === r.date).length > 1
        ? `${r.date} #${arr.slice(0, i + 1).filter((x) => x.date === r.date).length}`
        : r.date,
      color: SERIES_COLORS[i],
      points: r.points,
    })),
  )

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

    {#if vshape.length}
      <section class="card">
        <h2>CO2 table, V-shaped</h2>
        <p class="muted">Total time under hold per session; the dots show every rep.</p>
        <ul class="rank">
          {#each vshapeSeries as s, i (s.label)}
            <li>
              <span class="rank-name"><span class="swatch" style="background:{s.color}"></span>{s.label}</span>
              <span class="rank-val">
                {fmtMMSS(vshape[i].total)}
                <span class="muted">
                  · {vshape[i].points.length} reps{i > 0 ? ` · ${vshape[i].total >= vshape[i - 1].total ? '+' : '−'}${fmtMMSS(Math.abs(vshape[i].total - vshape[i - 1].total))} vs prior` : ''}
                </span>
              </span>
            </li>
          {/each}
        </ul>
        <RepDotPlot series={vshapeSeries} yFmt={fmtMMSS} yLabel="hold time" legend={false} />
        {#if vshapeAll.length > vshape.length}
          <p class="muted">Showing the last {vshape.length} of {vshapeAll.length} sessions.</p>
        {/if}
      </section>
    {/if}

    {#if warmupRows.length}
      <section class="card">
        <h2>Static max by warm-up</h2>
        <p class="muted">Best max-attempt hold, grouped by the warm-up that preceded it.</p>
        <ul class="rank">
          {#each warmupRows as r (r.name)}
            <li>
              <span class="rank-name">{r.name}</span>
              <span class="rank-val">{dash(r.best)} <span class="muted">· avg {dash(r.avg)} · n {r.n}</span></span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}

  <div class="actions">
    <button class="link" onclick={() => setView('home')}>Back</button>
  </div>
</main>
