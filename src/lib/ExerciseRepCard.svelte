<script>
  // One per-exercise history card for a rep-dot CO2 table. Given the session
  // list and a registry entry {id, title, blurb, metric}, it lists each of the
  // last five instances with its headline number and delta versus the prior
  // instance, then draws the dot plot of every rep. metric 'total' headlines
  // total time under hold; metric 'reps' headlines reps completed.
  import { exerciseRepHistory, exerciseSeries, SERIES_COLORS } from './insights.js'
  import { fmtMMSS } from './settings.js'
  import RepDotPlot from './RepDotPlot.svelte'
  import SessionTrend from './SessionTrend.svelte'

  let { sessions = [], entry } = $props()

  const all = $derived(exerciseRepHistory(sessions, entry.id))
  const series = $derived(exerciseSeries(all))

  const isReps = $derived(entry.metric === 'reps')
  const reps = (n) => `${n} rep${n === 1 ? '' : 's'}`
  const headline = (s) => (isReps ? s.reps : s.total)
  const fmtHead = (v) => (isReps ? reps(v) : fmtMMSS(v))
  const fmtDelta = (v) => (isReps ? reps(v) : fmtMMSS(v))
  const secondary = (s) => (isReps ? fmtMMSS(s.total) : reps(s.reps))

  // The headline metric across the full history, drawn as a session trend below
  // the rep dots so progression reads at a glance while the dots keep the
  // per-rep detail. Reps get a plain integer axis; total time an mm:ss axis.
  const trendPts = $derived(
    all.map((r) => ({ label: r.date.slice(5), v: isReps ? r.points.length : r.total })),
  )
  const trendLabel = $derived(isReps ? 'Reps completed by session' : 'Total time by session')
  const trendColor = $derived(isReps ? SERIES_COLORS[0] : SERIES_COLORS[1])
  const trendFmt = $derived(isReps ? (v) => String(v) : fmtMMSS)
  const trendSteps = $derived(isReps ? [1, 2, 5, 10] : [15, 30, 60, 120, 300])
</script>

{#if series.length}
  <section class="card">
    <h2>{entry.title}</h2>
    <p class="muted">{entry.blurb}</p>
    <ul class="rank">
      {#each series as s, i (s.label)}
        <li>
          <span class="rank-name"><span class="swatch" style="background:{s.color}"></span>{s.label}</span>
          <span class="rank-val">
            {fmtHead(headline(s))}
            <span class="muted">
              · {secondary(s)}{i > 0
                ? ` · ${headline(s) >= headline(series[i - 1]) ? '+' : '−'}${fmtDelta(Math.abs(headline(s) - headline(series[i - 1])))} vs prior`
                : ''}
            </span>
          </span>
        </li>
      {/each}
    </ul>
    <RepDotPlot {series} yFmt={fmtMMSS} yLabel="hold time" legend={false} />
    {#if all.length > series.length}
      <p class="muted">Dots show the last {series.length} of {all.length} sessions.</p>
    {/if}
    <p class="muted trend-cap">{trendLabel}</p>
    <SessionTrend points={trendPts} yFmt={trendFmt} yLabel={trendLabel} color={trendColor} steps={trendSteps} />
  </section>
{/if}

<style>
  .trend-cap {
    margin-top: 0.6rem;
  }
</style>
