<script>
  import { LIB_FILTERS, CAPACITY_FILTERS, PHASE_FILTERS } from './library.js'

  // Up to three chip rows over the exercise library: discipline (one always
  // active), capacity, and phase (tap to select, tap again to clear on the
  // latter two). `children` renders at the right end of the discipline row,
  // for a tally or similar. The phase row only renders when `showPhases` is
  // set, so the full edition (no phase-tagged templates) never shows it.
  let {
    disc = $bindable('all'),
    cap = $bindable(null),
    phase = $bindable(null),
    showPhases = false,
    children,
  } = $props()
</script>

<div class="filters">
  {#each LIB_FILTERS as f (f.key)}
    <button class="chip" class:active={disc === f.key} onclick={() => (disc = f.key)}>
      {f.label}
    </button>
  {/each}
  {@render children?.()}
</div>
<div class="filters filters-cap">
  {#each CAPACITY_FILTERS as f (f.key)}
    <button class="chip" class:active={cap === f.key} onclick={() => (cap = cap === f.key ? null : f.key)}>
      {f.label}
    </button>
  {/each}
</div>
{#if showPhases}
  <div class="filters filters-cap">
    {#each PHASE_FILTERS as f (f.key)}
      <button class="chip" class:active={phase === f.key} onclick={() => (phase = phase === f.key ? null : f.key)}>
        {f.label}
      </button>
    {/each}
  </div>
{/if}
