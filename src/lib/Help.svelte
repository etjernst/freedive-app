<script>
  // Tap-to-toggle help bubble. Mobile-friendly (no hover), closes on a second
  // tap. Pass the explanation as child content.
  let { children } = $props()
  let open = $state(false)
</script>

<span class="help">
  <button type="button" class="help-btn" onclick={() => (open = !open)} aria-label="What's this?">
    i
  </button>
  {#if open}
    <span class="help-pop">{@render children?.()}</span>
  {/if}
</span>
