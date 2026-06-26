<script>
  import { app, saveSettings, setView } from './lib/store.svelte.js'
  import {
    ONE_C_BUCKETS,
    INTENSITIES,
    parseMMSS,
    fmtMMSS,
    numOrNull,
  } from './lib/settings.js'

  // String-form working copy: every input edits text, parsed back to typed
  // values on save. Seeded once from the loaded settings (the view only mounts
  // after the app has loaded, so app.settings is current here).
  function buildDraft(s) {
    return {
      pbs: {
        STA: fmtMMSS(s.pbs.STA),
        DNF: s.pbs.DNF ?? '',
        DYN: s.pbs.DYN ?? '',
        DYNb: s.pbs.DYNb ?? '',
      },
      pace: {
        DNF: s.pace_s_per_25.DNF ?? '',
        DYN: s.pace_s_per_25.DYN ?? '',
        DYNb: s.pace_s_per_25.DYNb ?? '',
      },
      pool: s.pool_length_m ?? '',
      vc: s.spirometer.vital_capacity_l ?? '',
      packed: s.spirometer.packed_l ?? '',
      oneC: Object.fromEntries(
        ONE_C_BUCKETS.map((b) => [b.key, fmtMMSS(s.one_c_baseline_s[b.key])]),
      ),
      breathing: Object.entries(s.breathing_intensity).map(([pattern, intensity]) => ({
        pattern,
        intensity,
      })),
    }
  }

  let sd = $state(buildDraft(app.settings))
  let saved = $state(false)

  function addBreathing() {
    sd.breathing = [...sd.breathing, { pattern: '', intensity: 'soft' }]
  }
  function removeBreathing(i) {
    sd.breathing = sd.breathing.filter((_, j) => j !== i)
  }

  function toSettings() {
    const oneC = {}
    for (const [k, v] of Object.entries(sd.oneC)) {
      const s = parseMMSS(v)
      if (s != null) oneC[k] = s
    }
    const breathing = {}
    for (const row of sd.breathing) {
      const p = row.pattern.trim()
      if (p) breathing[p] = row.intensity
    }
    return {
      pbs: {
        STA: parseMMSS(sd.pbs.STA),
        DNF: numOrNull(sd.pbs.DNF),
        DYN: numOrNull(sd.pbs.DYN),
        DYNb: numOrNull(sd.pbs.DYNb),
      },
      pace_s_per_25: {
        DNF: numOrNull(sd.pace.DNF),
        DYN: numOrNull(sd.pace.DYN),
        DYNb: numOrNull(sd.pace.DYNb),
      },
      pool_length_m: numOrNull(sd.pool) ?? 25,
      spirometer: { vital_capacity_l: numOrNull(sd.vc), packed_l: numOrNull(sd.packed) },
      one_c_baseline_s: oneC,
      breathing_intensity: breathing,
    }
  }

  async function onSave() {
    await saveSettings(toSettings())
    saved = true
    setTimeout(() => (saved = false), 2000)
  }
</script>

<main>
  <section class="card">
    <h2>Personal bests</h2>
    <div class="field"><label for="pb-sta">STA (mm:ss)</label><input id="pb-sta" inputmode="numeric" bind:value={sd.pbs.STA} placeholder="6:00" /></div>
    <div class="field"><label for="pb-dnf">DNF (m)</label><input id="pb-dnf" type="number" bind:value={sd.pbs.DNF} placeholder="150" /></div>
    <div class="field"><label for="pb-dyn">DYN monofin (m)</label><input id="pb-dyn" type="number" bind:value={sd.pbs.DYN} placeholder="200" /></div>
    <div class="field"><label for="pb-dynb">DYNb bifins (m)</label><input id="pb-dynb" type="number" bind:value={sd.pbs.DYNb} /></div>
  </section>

  <section class="card">
    <h2>Pace (seconds per 25 m)</h2>
    <p class="muted">Drives session-time estimates. STA has no pace.</p>
    <div class="field"><label for="pace-dnf">DNF</label><input id="pace-dnf" type="number" bind:value={sd.pace.DNF} /></div>
    <div class="field"><label for="pace-dyn">DYN</label><input id="pace-dyn" type="number" bind:value={sd.pace.DYN} /></div>
    <div class="field"><label for="pace-dynb">DYNb</label><input id="pace-dynb" type="number" bind:value={sd.pace.DYNb} /></div>
  </section>

  <section class="card">
    <h2>Pool and spirometer</h2>
    <div class="field"><label for="pool">Pool length (m)</label><input id="pool" type="number" bind:value={sd.pool} placeholder="25" /></div>
    <div class="field"><label for="vc">Vital capacity (L)</label><input id="vc" type="number" step="0.1" bind:value={sd.vc} /></div>
    <div class="field"><label for="packed">Packed volume (L)</label><input id="packed" type="number" step="0.1" bind:value={sd.packed} /></div>
  </section>

  <section class="card">
    <h2>First-contraction baseline</h2>
    <p class="muted">Cold-start values (mm:ss) until logged history takes over.</p>
    {#each ONE_C_BUCKETS as b (b.key)}
      <div class="field">
        <label for={'oc-' + b.key}>{b.label}</label>
        <input id={'oc-' + b.key} inputmode="numeric" bind:value={sd.oneC[b.key]} placeholder="3:30" />
      </div>
    {/each}
  </section>

  <section class="card">
    <h2>Breathing pattern intensity</h2>
    <p class="muted">How each prep pattern reads for the analysis layer.</p>
    {#each sd.breathing as row, i (i)}
      <div class="field breathing-row">
        <input class="pattern" bind:value={row.pattern} placeholder="5:5" />
        <select bind:value={row.intensity}>
          {#each INTENSITIES as opt}<option value={opt}>{opt.replace('_', ' ')}</option>{/each}
        </select>
        <button class="link" onclick={() => removeBreathing(i)} aria-label="Remove">✕</button>
      </div>
    {/each}
    <div class="actions">
      <button class="link" onclick={addBreathing}>+ Add pattern</button>
    </div>
  </section>

  <div class="actions sticky-save">
    <button onclick={onSave}>{saved ? 'Saved ✓' : 'Save settings'}</button>
    <button class="link" onclick={() => setView('home')}>Back</button>
  </div>
</main>
