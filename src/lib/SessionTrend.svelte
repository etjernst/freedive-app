<script>
  // One headline metric across sessions: x = session (chronological, evenly
  // spaced), y = value, a single connected line ending in a bold dot at the
  // latest session. The figure type for exercises whose progress is one number
  // per session (reps completed, total time, a max hold or distance). Points are
  // {label, v} oldest-first; steps picks the y-axis tick unit.
  let {
    points = [],
    yFmt = (v) => String(v),
    yLabel = '',
    color = '#2f6ba8',
    steps = [1, 2, 5, 10, 20, 50],
  } = $props()

  const W = 400
  const H = 150
  const M = { top: 10, right: 10, bottom: 30, left: 40 }
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom

  const n = $derived(points.length)
  const maxV = $derived(Math.max(1, ...points.map((p) => p.v)))
  const yStep = $derived(steps.find((st) => maxV / st <= 5) ?? steps[steps.length - 1])
  const yMax = $derived(Math.ceil(maxV / yStep) * yStep)
  const yTicks = $derived(Array.from({ length: yMax / yStep + 1 }, (_, i) => i * yStep))

  // Single point sits centered; otherwise span the inner width end to end.
  const x = (i) => (n <= 1 ? M.left + innerW / 2 : M.left + (i / (n - 1)) * innerW)
  const y = (v) => M.top + innerH - (v / yMax) * innerH
  const line = $derived(points.map((p, i) => `${x(i)},${y(p.v)}`).join(' '))

  // Keep the first and last date labels flush inside the plot rather than
  // centered (which clips them at the edges), and thin to ~7 labels so a long
  // history never crowds the axis.
  const labelAnchor = (i) => (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle')
  const labelStride = $derived(Math.ceil(n / 7))
  const showLabel = (i) => i === 0 || i === n - 1 || i % labelStride === 0

  // Tap/hover detail; last dot is bold so the latest session reads at a glance.
  let picked = $state(null)
  function pick(p, i) {
    picked = picked && picked.i === i ? null : { i, label: p.label, v: p.v }
  }
</script>

<div class="trendplot">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <svg
    viewBox="0 0 {W} {H}"
    role="img"
    aria-label="{yLabel || 'Value'} across sessions"
    onclick={() => (picked = null)}
  >
    {#each yTicks as t (t)}
      <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} class="grid" />
      <text x={M.left - 6} y={y(t) + 3.5} class="tick" text-anchor="end">{yFmt(t)}</text>
    {/each}
    <polyline points={line} fill="none" stroke={color} class="trend" />
    {#each points as p, i (p.label)}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <circle
        cx={x(i)}
        cy={y(p.v)}
        r={i === n - 1 ? 6 : 4}
        fill={color}
        class="dot"
        class:last={i === n - 1}
        onclick={(e) => { e.stopPropagation(); pick(p, i) }}
      >
        <title>{p.label} · {yFmt(p.v)}</title>
      </circle>
      {#if showLabel(i)}
        <text x={x(i)} y={H - 8} class="tick" text-anchor={labelAnchor(i)}>{p.label}</text>
      {/if}
    {/each}
  </svg>
  {#if picked}
    <div class="tip" style="left: {(x(picked.i) / W) * 100}%; top: {(y(picked.v) / H) * 100}%">
      {picked.label} · {yFmt(picked.v)}
    </div>
  {/if}
</div>

<style>
  .trendplot {
    position: relative;
  }
  .trendplot svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .grid {
    stroke: var(--border);
    stroke-width: 1;
  }
  .tick {
    font-size: 9px;
    fill: var(--muted);
  }
  .trend {
    stroke-width: 2;
    fill: none;
    stroke-opacity: 0.55;
  }
  .dot {
    /* Match the rep dots: transparency keeps a dense run of sessions readable. */
    fill-opacity: 0.72;
    cursor: pointer;
  }
  .dot.last {
    fill-opacity: 0.9;
  }
  .tip {
    position: absolute;
    transform: translate(-50%, -140%);
    background: var(--text);
    color: var(--bg);
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
  }
</style>
