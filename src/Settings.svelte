<script>
  import { app, saveSettings, setView, refreshLibrary } from './lib/store.svelte.js'
  import {
    PB_FIELDS,
    ONE_C_BUCKETS,
    INTENSITIES,
    parseMMSS,
    fmtMMSS,
    autoColon,
    numOrNull,
  } from './lib/settings.js'

  // String-form working copy: every input edits text, parsed back to typed
  // values on save. Seeded once from the loaded settings (the view only mounts
  // after the app has loaded, so app.settings is current here).
  function buildDraft(s) {
    return {
      pbs: Object.fromEntries(
        PB_FIELDS.map((f) => [
          f.key,
          f.unit === 'time' ? fmtMMSS(s.pbs[f.key]) : (s.pbs[f.key] ?? ''),
        ]),
      ),
      pace: {
        DNF: s.pace_s_per_25.DNF ?? '',
        DYN: s.pace_s_per_25.DYN ?? '',
        DYNb: s.pace_s_per_25.DYNb ?? '',
      },
      sprintPace: {
        DNF: s.sprint_pace_s_per_25.DNF ?? '',
        DYN: s.sprint_pace_s_per_25.DYN ?? '',
        DYNb: s.sprint_pace_s_per_25.DYNb ?? '',
      },
      swimPace: s.swim_pace_s_per_25 ?? '',
      recBreath: s.recovery_breath_s ?? '',
      pool: s.pool_length_m ?? '',
      vc: s.spirometer.vital_capacity_l ?? '',
      packed: s.spirometer.packed_l ?? '',
      oneC: Object.fromEntries(
        ONE_C_BUCKETS.map((b) => [
          b.key,
          b.unit === 'time' ? fmtMMSS(s.one_c_baseline[b.key]) : (s.one_c_baseline[b.key] ?? ''),
        ]),
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
    for (const b of ONE_C_BUCKETS) {
      const raw = sd.oneC[b.key]
      const val = b.unit === 'time' ? parseMMSS(raw) : numOrNull(raw)
      if (val != null) oneC[b.key] = val
    }
    const breathing = {}
    for (const row of sd.breathing) {
      const p = row.pattern.trim()
      if (p) breathing[p] = row.intensity
    }
    return {
      pbs: Object.fromEntries(
        PB_FIELDS.map((f) => [
          f.key,
          f.unit === 'time' ? parseMMSS(sd.pbs[f.key]) : numOrNull(sd.pbs[f.key]),
        ]),
      ),
      pace_s_per_25: {
        DNF: numOrNull(sd.pace.DNF),
        DYN: numOrNull(sd.pace.DYN),
        DYNb: numOrNull(sd.pace.DYNb),
      },
      sprint_pace_s_per_25: {
        DNF: numOrNull(sd.sprintPace.DNF),
        DYN: numOrNull(sd.sprintPace.DYN),
        DYNb: numOrNull(sd.sprintPace.DYNb),
      },
      swim_pace_s_per_25: numOrNull(sd.swimPace),
      recovery_breath_s: numOrNull(sd.recBreath) ?? 10,
      pool_length_m: numOrNull(sd.pool) ?? 25,
      spirometer: { vital_capacity_l: numOrNull(sd.vc), packed_l: numOrNull(sd.packed) },
      one_c_baseline: oneC,
      breathing_intensity: breathing,
    }
  }

  async function onSave() {
    await saveSettings(toSettings())
    saved = true
    setTimeout(() => (saved = false), 2000)
  }

  let libNotice = $state(null)
  async function onRefreshLibrary() {
    if (!confirm('Refresh updates the built-in exercises to the latest version. Your own saved exercises are not touched. Continue?')) return
    const n = await refreshLibrary()
    libNotice = `Library refreshed (${n} exercises)`
    setTimeout(() => (libNotice = null), 2500)
  }
</script>

<main>
  <section class="card">
    <h2>Personal bests</h2>
    {#each PB_FIELDS as f, fi (f.key)}
      {#if fi === 0 || PB_FIELDS[fi - 1].group !== f.group}
        <h3 class="pb-group">{f.group}</h3>
      {/if}
      <div class="field">
        <label for={'pb-' + f.key}>{f.label} {f.unit === 'time' ? '(mm:ss)' : '(m)'}</label>
        <input
          id={'pb-' + f.key}
          inputmode="numeric"
          bind:value={sd.pbs[f.key]}
          oninput={(e) => {
            if (f.unit !== 'time') return
            sd.pbs[f.key] = autoColon(e.target.value)
            e.target.value = sd.pbs[f.key]
          }}
          placeholder={f.unit === 'time' ? '6:00' : '150'}
        />
      </div>
    {/each}
  </section>

  <section class="card">
    <h2>Pace (seconds per 25 m)</h2>
    <p class="muted">Drives session-time estimates. STA has no pace.</p>
    <div class="field"><label for="pace-dnf">DNF cruise</label><input id="pace-dnf" type="number" bind:value={sd.pace.DNF} /></div>
    <div class="field"><label for="pace-dyn">DYN cruise</label><input id="pace-dyn" type="number" bind:value={sd.pace.DYN} /></div>
    <div class="field"><label for="pace-dynb">DYNb cruise</label><input id="pace-dynb" type="number" bind:value={sd.pace.DYNb} /></div>
    <div class="field"><label for="spr-dnf">DNF sprint</label><input id="spr-dnf" type="number" bind:value={sd.sprintPace.DNF} /></div>
    <div class="field"><label for="spr-dyn">DYN sprint</label><input id="spr-dyn" type="number" bind:value={sd.sprintPace.DYN} /></div>
    <div class="field"><label for="spr-dynb">DYNb sprint</label><input id="spr-dynb" type="number" bind:value={sd.sprintPace.DYNb} /></div>
    <div class="field"><label for="swim">Surface swim (hypercapnic)</label><input id="swim" type="number" bind:value={sd.swimPace} /></div>
  </section>

  <section class="card">
    <h2>Recovery</h2>
    <p class="muted">Seconds one recovery breath takes, for breath-counted recoveries.</p>
    <div class="field"><label for="recb">Seconds per breath</label><input id="recb" type="number" bind:value={sd.recBreath} placeholder="10" /></div>
  </section>

  <section class="card">
    <h2>Pool and spirometer</h2>
    <div class="field"><label for="pool">Default pool length (m)</label><input id="pool" type="number" bind:value={sd.pool} placeholder="25" /></div>
    <p class="muted">Seeds new sessions; each session can override it in the builder.</p>
    <div class="field"><label for="vc">Vital capacity (L)</label><input id="vc" type="number" step="0.1" bind:value={sd.vc} /></div>
    <div class="field"><label for="packed">Packed volume (L)</label><input id="packed" type="number" step="0.1" bind:value={sd.packed} /></div>
    <p class="muted">To trend VC over time, log dated readings under Log measurement on the home screen.</p>
  </section>

  <section class="card">
    <h2>First-contraction baseline</h2>
    <p class="muted">Cold-start values until logged history takes over. Static in mm:ss, dynamic in meters.</p>
    {#each ONE_C_BUCKETS as b (b.key)}
      <div class="field">
        <label for={'oc-' + b.key}>{b.label} {b.unit === 'time' ? '(mm:ss)' : '(m)'}</label>
        <input
          id={'oc-' + b.key}
          inputmode="numeric"
          bind:value={sd.oneC[b.key]}
          oninput={(e) => {
            if (b.unit !== 'time') return
            sd.oneC[b.key] = autoColon(e.target.value)
            e.target.value = sd.oneC[b.key]
          }}
          placeholder={b.unit === 'time' ? '3:30' : '40'}
        />
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

  <section class="card">
    <h2>Exercise library</h2>
    <p class="muted">Update the built-in exercises to the latest version. Your own saved exercises are left untouched.</p>
    <div class="actions">
      <button onclick={onRefreshLibrary}>Refresh library from latest</button>
    </div>
    {#if libNotice}<p class="notice">{libNotice}</p>{/if}
  </section>

  <div class="actions sticky-save">
    <button onclick={onSave}>{saved ? 'Saved ✓' : 'Save settings'}</button>
    <button class="link" onclick={() => setView('home')}>Back</button>
  </div>
</main>
