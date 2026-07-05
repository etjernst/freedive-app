<script>
  // Dot plot of per-rep values across sessions: x = rep number, y = value,
  // one colored series per session. Pure presentational; the caller passes
  // series [{ label, color, points: [{ rep, v }] }] and a y-axis formatter.
  let { series = [], yFmt = (v) => String(v), yLabel = '', legend = true } = $props()

  const W = 340
  const H = 190
  // Right margin leaves room for the "rep" axis word past the last tick.
  const M = { top: 10, right: 34, bottom: 26, left: 44 }
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom

  const maxRep = $derived(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.rep))))
  const maxV = $derived(Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.v))))

  // y starts at 0 so hold magnitudes compare honestly across sessions.
  // Tick step snaps to a round 30s/60s-style unit for a handful of ticks.
  const yStep = $derived.by(() => {
    const steps = [15, 30, 60, 120, 300]
    return steps.find((st) => maxV / st <= 5) ?? 600
  })
  const yMax = $derived(Math.ceil(maxV / yStep) * yStep)
  const yTicks = $derived(Array.from({ length: yMax / yStep + 1 }, (_, i) => i * yStep))

  const x = (rep) => M.left + ((rep - 0.5) / maxRep) * innerW
  // Dodge series a few px around the rep position so equal values from
  // different sessions sit side by side instead of occluding each other.
  const dodge = $derived((si) => (si - (series.length - 1) / 2) * 5)
  const y = $derived((v) => M.top + innerH - (v / yMax) * innerH)

  // Label every rep up to 12, then every other, so the axis never crowds.
  const repTicks = $derived(
    Array.from({ length: maxRep }, (_, i) => i + 1).filter((r) => maxRep <= 12 || r % 2 === 1),
  )
</script>

<div class="dotplot">
  <svg viewBox="0 0 {W} {H}" role="img" aria-label="Per-rep values by session{yLabel ? `, ${yLabel}` : ''}">
    {#each yTicks as t (t)}
      <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} class="grid" />
      <text x={M.left - 6} y={y(t) + 3.5} class="tick" text-anchor="end">{yFmt(t)}</text>
    {/each}
    {#each repTicks as r (r)}
      <text x={x(r)} y={H - 8} class="tick" text-anchor="middle">{r}</text>
    {/each}
    <text x={W - 4} y={H - 8} class="tick axis-name" text-anchor="end">rep</text>
    {#each series as s, si (s.label)}
      {#each s.points as p (p.rep)}
        <circle cx={x(p.rep) + dodge(si)} cy={y(p.v)} r="4.5" fill={s.color} class="dot">
          <title>{s.label} · rep {p.rep} · {yFmt(p.v)}</title>
        </circle>
      {/each}
    {/each}
  </svg>
  {#if legend}
    <div class="legend">
      {#each series as s (s.label)}
        <span class="key"><span class="swatch" style="background:{s.color}"></span>{s.label}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .dotplot svg {
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
  .axis-name {
    font-style: italic;
  }
  .dot {
    /* 2px surface ring so overlapping dots from different sessions stay separable. */
    stroke: var(--panel);
    stroke-width: 2;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 4px;
  }
  .key {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--muted);
  }
  .swatch {
    width: 9px;
    height: 9px;
    border-radius: 50%;
  }
</style>
