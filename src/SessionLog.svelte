<script>
  import { app, currentSession, saveSession, setView } from './lib/store.svelte.js'
  import {
    seedActual,
    blankActualRep,
    repSegments,
    contractionUnit,
    turnsFor,
    describeHold,
    describeDistance,
    describeRecovery,
    clone,
    DEVIATION_REASONS,
    INCIDENTS,
    FEELS,
  } from './lib/session.js'
  import MMSS from './lib/MMSS.svelte'
  import Help from './lib/Help.svelte'

  // Clone the loaded session and seed an empty actual for any exercise not yet
  // logged. The planned snapshot is read-only here; we only ever write actuals.
  let draft = $state(clone(currentSession()))
  for (const ex of draft.exercises) {
    if (!ex.actual) ex.actual = seedActual(ex)
  }
  let open = $state({}) // rep details toggles, keyed `${ei}-${ri}`
  let saved = $state(false)

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
    ex.actual.reps = [...ex.actual.reps, blankActualRep(last?.plan_index ?? null)]
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
  <section class="card">
    <p class="muted">{draft.date} · logging actuals against your plan</p>
  </section>

  {#each draft.exercises as ex, ei (ex.id)}
    <section class="card exercise">
      <div class="ex-head">
        <span class="ex-name-static">{ex.name}</span>
        <span class="tags">{ex.discipline}</span>
      </div>

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
    <textarea class="remarks" bind:value={draft.session_remarks} placeholder="Session remarks"></textarea>
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
