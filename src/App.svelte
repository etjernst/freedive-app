<script>
  import fixtures from '../seed/fixtures.json'
  import { pwa, applyUpdate } from './lib/pwa.svelte.js'

  // Phase 1 shell: confirm the seed library loads end to end. The real
  // capture, calendar, and coaching faces land in later phases.
  const templates = fixtures.templates ?? fixtures
</script>

<div class="splash" aria-hidden="true">
  <div class="splash-inner">
    <div class="wordmark">Winnow</div>
    <p class="mantra">No quick decisions</p>
  </div>
</div>

{#if pwa.needRefresh}
  <div class="banner" role="status">
    <span>A new version is ready.</span>
    <button onclick={applyUpdate}>Update</button>
  </div>
{/if}

<header>
  <h1>Winnow</h1>
  <p class="tagline">Capture, tracking, and coaching</p>
</header>

<main>
  <section class="card">
    <h2>Exercise library</h2>
    <p class="muted">{templates.length} seed templates loaded</p>
    <ul class="library">
      {#each templates as t}
        <li>
          <span class="name">{t.name ?? t.id}</span>
          {#if t.capacity_tags}
            <span class="tags">{t.capacity_tags.join(' · ')}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <p class="phase-note">Phase 1 shell — storage, sync, and capture to come.</p>
</main>
