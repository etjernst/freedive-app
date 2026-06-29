<script>
  import { app, currentSession, saveSession, setView } from './lib/store.svelte.js'
  import {
    seedActual,
    blankActualRep,
    instantiateExercise,
    blankExercise,
    repSegments,
    contractionUnit,
    turnsFor,
    describeHold,
    describeDistance,
    describeRecovery,
    planOverview,
    clone,
    isDynamic,
    DISCIPLINES,
    DEVIATION_REASONS,
    INCIDENTS,
    FEELS,
    LUNG_OPTS,
    SPEED_OPTS,
  } from './lib/session.js'
  import MMSS from './lib/MMSS.svelte'
  import Help from './lib/Help.svelte'

  // Clone the loaded session and seed an empty actual for any exercise not yet
  // logged. The planned snapshot is read-only here; we only ever write actuals.
  let draft = $state(clone(currentSession()))
  for (const ex of draft.exercises) {
    ex.medium ??= 'wet'
    if (!ex.actual) ex.actual = seedActual(ex)
    else {
      // Backfill realized lung volume / pace on sessions logged before these
      // fields existed, so the new controls bind cleanly. Seed from the matching
      // planned rep when there is one, else full lung / normal.
      for (const ar of ex.actual.reps) {
        ar.lung_volume ??= plannedRep(ex, ar)?.lung_volume ?? 'FL'
        ar.pace ??= plannedRep(ex, ar)?.pace ?? null
      }
    }
  }
  let open = $state({}) // rep details toggles, keyed `${ei}-${ri}`
  let saved = $state(false)
  let chosen = $state('')

  // Add an exercise straight in the log (for quick-logging a past session with
  // no plan): instantiate it and seed an empty actual to fill in.
  function addTemplate(id = chosen) {
    const t = app.templates.find((x) => x.id === id)
    if (!t) return
    const ex = instantiateExercise(t)
    ex.actual = seedActual(ex)
    draft.exercises = [...draft.exercises, ex]
    chosen = ''
  }
  function addAdhoc() {
    const ex = blankExercise()
    ex.actual = seedActual(ex)
    draft.exercises = [...draft.exercises, ex]
  }
  function removeExercise(i) {
    draft.exercises = draft.exercises.filter((_, j) => j !== i)
  }

  const breathingPatterns = Object.keys(app.settings.breathing_intensity ?? {})
  const pool = app.settings.pool_length_m ?? 25

  function plannedRep(ex, ar) {
    const reps = ex.planned?.reps ?? []
    return ar.plan_index != null ? reps[ar.plan_index] : null
  }
  function segsFor(ex, ar) {
    const p = plannedRep(ex, ar)
    return repSegments(p?.shape ?? ex.shape_default ?? 'simple', ex.discipline)
  }
  function toggle(key) {
    open[key] = !open[key]
  }
  function addRep(ex) {
    const last = ex.actual.reps[ex.actual.reps.length - 1]
    const ar = blankActualRep(last?.plan_index ?? null)
    ar.lung_volume = exLung(ex)
    ar.pace = exSpeed(ex) || null
    ex.actual.reps = [...ex.actual.reps, ar]
  }

  // Exercise-level realized lung volume / pace: read the first actual rep and
  // write all of them, with per-rep overrides under each rep's "More" details.
  // Mirrors the builder's plan-side controls but writes to ex.actual.reps.
  function exLung(ex) {
    return ex.actual.reps[0]?.lung_volume ?? 'FL'
  }
  function setExLung(ex, v) {
    ex.actual.reps = ex.actual.reps.map((r) => ({ ...r, lung_volume: v }))
  }
  function exSpeed(ex) {
    return ex.actual.reps[0]?.pace ?? ''
  }
  function setExSpeed(ex, v) {
    ex.actual.reps = ex.actual.reps.map((r) => ({ ...r, pace: v || null }))
  }
  function removeRep(ex, i) {
    ex.actual.reps = ex.actual.reps.filter((_, j) => j !== i)
  }

  async function save(back) {
    const snap = $state.snapshot(draft)
    snap.status = 'logged'
    await saveSession(snap)
    if (back) setView('sessions')
    else {
      saved = true
      setTimeout(() => (saved = false), 1500)
    }
  }
</script>

<main>
  <section class="card thoughts">
    <label class="lbl" for="session-thoughts">Thoughts</label>
    <textarea
      id="session-thoughts"
      class="remarks"
      bind:value={draft.session_remarks}
      placeholder="How did it go? Dictate your thoughts here."
    ></textarea>
  </section>

  {#if draft.exercises.length > 0}
    <section class="card overview">
      <h2>Plan</h2>
      {#each planOverview(draft) as ov (ov.id)}
        <div class="ov-ex">
          <div class="ov-head">
            <span class="ov-name">{ov.name}</span>
            {#if ov.sets > 1}<span class="ov-sets">×{ov.sets} sets</span>{/if}
            <span class="ov-disc">{ov.discipline}</span>
          </div>
          {#each ov.lines as line}<div class="ov-line">{line}</div>{/each}
          {#if ov.note}<div class="ov-note">{ov.note}</div>{/if}
        </div>
      {/each}
    </section>
  {/if}

  <section class="card">
    <div class="field">
      <label for="log-date">Date</label>
      <input id="log-date" type="date" bind:value={draft.date} />
    </div>
    <div class="field add-row">
      <select bind:value={chosen}>
        <option value="" disabled>Add exercise…</option>
        {#each app.templates as t (t.id)}
          <option value={t.id}>{t.name} ({t.discipline})</option>
        {/each}
      </select>
      <button class="add-btn" onclick={() => addTemplate()} disabled={!chosen}>Add</button>
    </div>
    <div class="actions">
      <button class="link" onclick={addAdhoc}>+ Ad-hoc exercise</button>
    </div>
  </section>

  {#if draft.exercises.length === 0}
    <p class="muted center">No exercises yet. Add one above, then fill in what you did.</p>
  {/if}

  {#each draft.exercises as ex, ei (ex.id)}
    <section class="card exercise">
      <div class="ex-head">
        <input class="ex-name" bind:value={ex.name} />
        <div class="ex-move">
          <button class="link" onclick={() => removeExercise(ei)} aria-label="Remove exercise">✕</button>
        </div>
      </div>
      <div class="field">
        <span class="lbl">Discipline</span>
        <select bind:value={ex.discipline}>
          {#each DISCIPLINES as d}<option value={d}>{d}</option>{/each}
        </select>
      </div>
      {#if ex.discipline === 'STA'}
        <div class="field">
          <span class="lbl">Medium</span>
          <select bind:value={ex.medium}>
            <option value="wet">wet</option>
            <option value="dry">dry</option>
          </select>
        </div>
      {/if}
      <div class="field">
        <span class="lbl">Lung volume</span>
        <select value={exLung(ex)} onchange={(e) => setExLung(ex, e.currentTarget.value)}>
          {#each LUNG_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
        </select>
      </div>
      {#if isDynamic(ex.discipline)}
        <div class="field">
          <span class="lbl">Speed</span>
          <select value={exSpeed(ex)} onchange={(e) => setExSpeed(ex, e.currentTarget.value)}>
            {#each SPEED_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
          </select>
        </div>
      {/if}
      {#if ex.plan_note}<p class="muted goal">{ex.plan_note}</p>{/if}

      <div class="reps">
        {#each ex.actual.reps as ar, ri (ri)}
          {@const p = plannedRep(ex, ar)}
          {@const segs = segsFor(ex, ar)}
          {@const cu = contractionUnit(ex.discipline)}
          <div class="rep">
            <div class="rep-top">
              <span class="rep-n">#{ri + 1}</span>
              <span class="planned-ctx">
                {#if p}
                  {#if segs.includes('hold')}plan {describeHold(p.hold_target)}{/if}
                  {#if segs.includes('distance')} {describeDistance(p.distance_target)}{/if}
                  {#if p.lung_volume && p.lung_volume !== 'FL'} · {p.lung_volume === 'RV' ? 'EL' : p.lung_volume}{/if}
                  {#if p.pace} · {p.pace.replace('_', ' ')}{/if}
                  {#if p.recovery} · rec {describeRecovery(p.recovery)}{/if}
                {:else}extra rep{/if}
              </span>
              <button class="link" onclick={() => removeRep(ex, ri)} aria-label="Remove rep">✕</button>
            </div>

            <div class="realized">
              {#if segs.includes('hold')}
                <div class="rfield"><span class="lbl">Hold</span><MMSS bind:seconds={ar.hold_s} /></div>
              {/if}
              {#if segs.includes('distance')}
                <div class="rfield">
                  <span class="lbl">Dist (m)</span>
                  <input type="number" bind:value={ar.distance_m} />
                  {#if ar.distance_m}<span class="hint">{turnsFor(ar.distance_m, pool)} turns</span>{/if}
                </div>
              {/if}
              {#if segs.includes('distance2')}
                <div class="rfield"><span class="lbl">Dist 2 (m)</span><input type="number" bind:value={ar.distance2_m} /></div>
              {/if}
              {#if segs.includes('continuous')}
                <div class="rfield"><span class="lbl">Duration</span><MMSS bind:seconds={ar.duration_s} /></div>
                <div class="rfield"><span class="lbl">Total (m)</span><input type="number" bind:value={ar.distance_m} /></div>
              {/if}
            </div>

            <label class="pb-check">
              <input type="checkbox" bind:checked={ar.new_pb} />
              New PB
            </label>

            <button class="link details-toggle" onclick={() => toggle(`${ei}-${ri}`)}>
              {open[`${ei}-${ri}`] ? 'Hide details' : 'More'}
            </button>

            {#if open[`${ei}-${ri}`]}
              <div class="details">
                <div class="rfield">
                  <span class="lbl">Lung volume</span>
                  <select bind:value={ar.lung_volume}>
                    {#each LUNG_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
                  </select>
                </div>
                {#if isDynamic(ex.discipline)}
                  <div class="rfield">
                    <span class="lbl">Speed</span>
                    <select value={ar.pace ?? ''} onchange={(e) => (ar.pace = e.currentTarget.value || null)}>
                      {#each SPEED_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
                    </select>
                  </div>
                {/if}
                <div class="rfield">
                  <span class="lbl">First contraction ({cu === 'time' ? 'mm:ss' : 'm'})</span>
                  {#if cu === 'time'}
                    <MMSS bind:seconds={ar.contraction_value} />
                  {:else}
                    <input type="number" bind:value={ar.contraction_value} />
                  {/if}
                </div>
                <div class="rfield">
                  <span class="lbl">Recovery</span>
                  <input type="number" bind:value={ar.recovery_value} />
                  <select bind:value={ar.recovery_unit}>
                    <option value={null}>unit</option>
                    <option value="time">s</option>
                    <option value="breaths">breaths</option>
                  </select>
                </div>
                {#if segs.includes('hold')}
                  <div class="rfield">
                    <span class="lbl">Prep</span>
                    <input list="breath-patterns" bind:value={ar.prep_pattern} placeholder="5:5" />
                    <MMSS bind:seconds={ar.prep_duration_s} placeholder="dur" />
                  </div>
                {/if}
                {#if ex.discipline === 'DNF'}
                  <div class="rfield"><span class="lbl">Strokes</span><input type="number" bind:value={ar.stroke_count} /></div>
                {/if}
                <div class="rfield triple">
                  <span><span class="lbl">HR hi</span><input type="number" bind:value={ar.hr_high} /></span>
                  <span><span class="lbl">HR lo</span><input type="number" bind:value={ar.hr_low} /></span>
                  <span><span class="lbl">SpO₂</span><input type="number" bind:value={ar.spo2_nadir} /></span>
                </div>
                <div class="rfield">
                  <span class="lbl">Incident</span>
                  <select bind:value={ar.incident}>
                    {#each INCIDENTS as inc}<option value={inc.value}>{inc.label}</option>{/each}
                  </select>
                </div>
                {#if ar.incident && ar.incident !== 'none'}
                  <input class="wide" bind:value={ar.incident_note} placeholder="Incident note" />
                {/if}
                <input class="wide" bind:value={ar.note} placeholder="Rep note" />
              </div>
            {/if}
          </div>
        {/each}
        <button class="link addrep" onclick={() => addRep(ex)}>+ Add rep</button>
      </div>

      <div class="ex-actual">
        <div class="field rpe-row">
          <span class="lbl">
            RPE physical / mental
            <Help>
              <strong>Rate of perceived exertion</strong><br />
              0–10, higher is harder. 0 is nothing at all, 10 is maximal.
            </Help>
          </span>
          <span class="rpe-inputs">
            <input type="number" min="0" max="10" bind:value={ex.actual.physical_rpe} placeholder="phys" />
            <input type="number" min="0" max="10" bind:value={ex.actual.mental_rpe} placeholder="ment" />
          </span>
        </div>
        <div class="field">
          <span class="lbl">Deviation</span>
          <select bind:value={ex.actual.deviation_reason}>
            {#each DEVIATION_REASONS as r}<option value={r.value}>{r.label}</option>{/each}
          </select>
        </div>
        <textarea class="remarks" bind:value={ex.actual.remarks} placeholder="Exercise remarks"></textarea>
      </div>
    </section>
  {/each}

  <section class="card">
    <h2>Session</h2>
    <div class="field">
      <span class="lbl">Overall feel</span>
      <select bind:value={draft.overall_feel}>
        <option value={null}>—</option>
        {#each FEELS as f}<option value={f}>{f}</option>{/each}
      </select>
    </div>
  </section>

  <datalist id="breath-patterns">
    {#each breathingPatterns as p}<option value={p}></option>{/each}
  </datalist>

  <div class="actions sticky-save">
    <button onclick={() => save(false)}>{saved ? 'Saved ✓' : 'Save log'}</button>
    <button class="log-btn" onclick={() => save(true)}>Save & close</button>
  </div>
  <div class="actions">
    <button class="link" onclick={() => setView('session-build')}>Edit plan</button>
    <button class="link" onclick={() => setView('sessions')}>Back to sessions</button>
  </div>
</main>
