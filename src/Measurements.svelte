<script>
  import { app, saveMeasurement, deleteMeasurement, setView } from './lib/store.svelte.js'
  import { newVitalCapacity } from './lib/measurements.js'
  import { numOrNull } from './lib/settings.js'

  let draft = $state(newVitalCapacity())
  let saved = $state(false)

  const readings = $derived(app.measurements.filter((m) => m.type === 'vital_capacity'))
  const canSave = $derived(numOrNull(draft.vc_l) != null || numOrNull(draft.packed_l) != null)

  async function save() {
    const doc = $state.snapshot(draft)
    doc.vc_l = numOrNull(doc.vc_l)
    doc.packed_l = numOrNull(doc.packed_l)
    await saveMeasurement(doc)
    draft = newVitalCapacity()
    saved = true
    setTimeout(() => (saved = false), 1500)
  }

  async function remove(id) {
    if (!confirm('Delete this reading?')) return
    await deleteMeasurement(id)
  }
</script>

<main>
  <section class="card">
    <h2>New vital-capacity reading</h2>
    <div class="field">
      <label for="meas-date">Date</label>
      <input id="meas-date" type="date" bind:value={draft.date} />
    </div>
    <div class="field">
      <label for="meas-vc">Vital capacity (L)</label>
      <input id="meas-vc" type="number" step="0.1" min="0" inputmode="decimal" bind:value={draft.vc_l} placeholder="e.g. 4.2" />
    </div>
    <div class="field">
      <label for="meas-packed">Packed (L)</label>
      <input id="meas-packed" type="number" step="0.1" min="0" inputmode="decimal" bind:value={draft.packed_l} placeholder="after packing, optional" />
    </div>
    <textarea class="remarks" rows="2" placeholder="Notes (optional)" bind:value={draft.notes}></textarea>
    <div class="actions">
      <button onclick={save} disabled={!canSave}>{saved ? 'Saved ✓' : 'Save reading'}</button>
    </div>
  </section>

  <section class="card">
    <h2>Readings</h2>
    {#if readings.length === 0}
      <p class="muted">No readings yet. VC readings you save build a dated series you can trend.</p>
    {/if}
    {#each readings as m (m.id)}
      <div class="meas-row">
        <span class="meas-date">{m.date}</span>
        <span class="meas-vals">
          {m.vc_l != null ? `${m.vc_l} L` : '—'}
          {#if m.packed_l != null}<span class="muted"> · packed {m.packed_l} L</span>{/if}
        </span>
        <button class="link" onclick={() => remove(m.id)} aria-label="Delete reading">✕</button>
        {#if m.notes}<span class="meas-notes muted">{m.notes}</span>{/if}
      </div>
    {/each}
  </section>

  <div class="actions">
    <button class="link" onclick={() => setView('home')}>Back home</button>
  </div>
</main>
