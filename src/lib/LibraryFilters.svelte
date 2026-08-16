<script>
  import { LIB_FILTERS, CAPACITY_FILTERS } from './library.js'

  // Two chip rows over the exercise library: discipline (one always active)
  // and capacity (tap to select, tap again to clear). `children` renders at
  // the right end of the discipline row, for a tally or similar.
  let { disc = $bindable('all'), cap = $bindable(null), children } = $props()
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
