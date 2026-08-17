<script>
  import { LIB_FILTERS, CAPACITY_FILTERS, PHASE_FILTERS } from './library.js'
  import { IS_SEALS } from './edition.js'

  // Filters over the exercise library. When `showPhases` is set (a library
  // with phase-tagged templates), a segmented phase bar sits on top: the coach
  // picks the block first, then browses. Below it, two labeled chip rows:
  // discipline (one always active) and capacity ("Trains"; tap to select, tap
  // again to clear). Each axis has its own hue so the tags on the cards read
  // as the same three kinds of thing. `children` renders at the right end of
  // the discipline row, for a tally or similar.
  let {
    disc = $bindable('all'),
    cap = $bindable(null),
    phase = $bindable(null),
    showPhases = false,
    templates = [],
    children,
  } = $props()

  // The Seals library has no static exercises, so its discipline row skips STA.
  const discFilters = IS_SEALS ? LIB_FILTERS.filter((f) => f.key !== 'STA') : LIB_FILTERS
  // Only the capacities some template in the loaded library actually carries,
  // so a small library (seals) does not show chips that match nothing.
  const capFilters = $derived.by(() => {
    const used = new Set(templates.flatMap((t) => t.capacity_tags ?? []))
    const shown = CAPACITY_FILTERS.filter((f) => used.has(f.key))
    return shown.length ? shown : CAPACITY_FILTERS
  })
</script>

{#if showPhases}
  <div class="phase-seg" role="group" aria-label="Phase">
    {#each PHASE_FILTERS as f (f.key)}
      <button class:active={phase === f.key} onclick={() => (phase = phase === f.key ? null : f.key)}>
        {f.label}
      </button>
    {/each}
  </div>
{/if}
<div class="filter-label" class:first={!showPhases}>Discipline</div>
<div class="filters filters-disc">
  {#each discFilters as f (f.key)}
    <button class="chip" class:active={disc === f.key} onclick={() => (disc = f.key)}>
      {f.label}
    </button>
  {/each}
  {@render children?.()}
</div>
<div class="filter-label">Trains</div>
<div class="filters filters-cap">
  {#each capFilters as f (f.key)}
    <button class="chip chip-cap" class:active={cap === f.key} onclick={() => (cap = cap === f.key ? null : f.key)}>
      {f.label}
    </button>
  {/each}
</div>
