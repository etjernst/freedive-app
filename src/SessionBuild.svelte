<script>
  import { app, currentSession, saveSession, setView } from './lib/store.svelte.js'
  import {
    instantiateExercise,
    blankExercise,
    blankRep,
    reuseExercise,
    repSegments,
    shapeHint,
    shapeLabel,
    describeHold,
    describeDistance,
    clone,
    DISCIPLINES,
    SHAPES,
  } from './lib/session.js'
  import { suggestionsFor } from './lib/affinities.js'
  import MMSS from './lib/MMSS.svelte'
  import Help from './lib/Help.svelte'

  const HOLD_QUAL = [
    { value: 'submax', label: 'sub-max' },
    { value: 'strong_submax', label: 'strong sub-max' },
    { value: 'max', label: 'max' },
    { value: 'close_to_max', label: 'close to max' },
  ]
  const REC_QUAL = ['minimal', 'adequate', 'full']

  // Working copy: clone the loaded session, edit freely, persist on save. The
  // plan we assemble here is what gets snapshotted; logging never touches it.
  let draft = $state(clone(currentSession()))
  let chosen = $state('')
  let saved = $state(false)
  let showHistory = $state(false)

  // Give every shown segment a target object to bind to, so the editor never
  // binds through undefined. Idempotent: only fills what is missing.
  function ensure(rep, discipline) {
    const segs = repSegments(rep.shape ?? 'simple', discipline)
    if (segs.includes('hold') && !rep.hold_target) rep.hold_target = { unit: 'absolute', value: null }
    if (segs.includes('distance') && !rep.distance_target) rep.distance_target = { unit: 'absolute', value: null }
    if (segs.includes('distance2') && !rep.distance2_target) rep.distance2_target = { unit: 'absolute', value: null }
    if (segs.includes('continuous') && !rep.continuous) rep.continuous = { duration_s: null, pattern: '' }
    if (!rep.recovery) rep.recovery = { type: 'absolute', value: null, unit: 'time' }
    return rep
  }
  function ensureExercise(ex) {
    for (const rep of ex.planned.reps) ensure(rep, ex.discipline)
  }
  // Seed-time pass so reloaded sessions render without a flash of empty binds.
  for (const ex of draft.exercises) ensureExercise(ex)

  function addTemplate(id = chosen) {
    const t = app.templates.find((x) => x.id === id)
    if (!t) return
    const ex = instantiateExercise(t)
    ensureExercise(ex)
    draft.exercises = [...draft.exercises, ex]
    chosen = ''
  }

  // "Goes well with" suggestions: exercises that co-occurred in the source
  // library with the ones already in the draft, ranked by co-occurrence weight.
  const addedIds = $derived(draft.exercises.map((e) => e.template_id).filter(Boolean))
  const suggestions = $derived(suggestionsFor(addedIds, app.templates))
  function addAdhoc() {
    const ex = blankExercise()
    ensureExercise(ex)
    draft.exercises = [...draft.exercises, ex]
  }

  // Re-usable exercises pulled from past sessions: the most recent filled-in
  // version of each distinct exercise (keyed by template, else name+discipline),
  // newest first, so a previously-entered rep block can be added in one click.
  const historyItems = $derived.by(() => {
    const seen = new Set()
    const out = []
    for (const s of app.sessions) {
      if (s.id === draft.id) continue
      for (const ex of s.exercises ?? []) {
        const key = ex.template_id || `${ex.name}|${ex.discipline}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ key, ex, date: s.date })
      }
    }
    return out.slice(0, 30)
  })

  function historySummary(ex) {
    const reps = ex.planned?.reps ?? []
    const n = reps.length * (ex.set_repeat ?? 1)
    const first = reps[0]
    let target = ''
    if (first?.hold_target?.value != null) target = `hold ${describeHold(first.hold_target)}`
    else if (first?.distance_target?.value != null) target = describeDistance(first.distance_target)
    return `${n} rep${n === 1 ? '' : 's'}${target ? ` · ${target}` : ''}`
  }

  function reuseFromHistory(srcEx) {
    const copy = reuseExercise(srcEx)
    ensureExercise(copy)
    draft.exercises = [...draft.exercises, copy]
    showHistory = false
  }
  function removeExercise(i) {
    draft.exercises = draft.exercises.filter((_, j) => j !== i)
  }
  function move(i, dir) {
    const j = i + dir
    if (j < 0 || j >= draft.exercises.length) return
    const next = [...draft.exercises]
    ;[next[i], next[j]] = [next[j], next[i]]
    draft.exercises = next
  }
  function onDiscipline(ex) {
    ensureExercise(ex)
  }
  function addRep(ex) {
    const rep = ensure(blankRep(ex.shape_default ?? 'simple'), ex.discipline)
    ex.planned.reps = [...ex.planned.reps, rep]
  }
  function removeRep(ex, i) {
    ex.planned.reps = ex.planned.reps.filter((_, j) => j !== i)
  }
  function onShape(rep, ex) {
    ensure(rep, ex.discipline)
  }
  // A feel word (minimal/adequate/full) only makes sense for the qualitative
  // type; fixed and cap need a number, the rule needs a condition. Reset the
  // value when switching across those families so a stale word never lands in
  // a numeric field.
  function onRecType(rep) {
    const t = rep.recovery.type
    if (t === 'qualitative') rep.recovery.value = 'adequate'
    else if (t === 'inequality') rep.recovery.value = ''
    else if (typeof rep.recovery.value !== 'number') rep.recovery.value = null
  }

  async function save(then) {
    await saveSession($state.snapshot(draft))
    if (then === 'log') setView('session-log')
    else {
      saved = true
      setTimeout(() => (saved = false), 1500)
    }
  }
</script>

<main>
  <section class="card">
    <div class="field">
      <label for="sess-date">Date</label>
      <input id="sess-date" type="date" bind:value={draft.date} />
    </div>
    <div class="field add-row">
      <select bind:value={chosen}>
        <option value="" disabled>Add from library…</option>
        {#each app.templates as t (t.id)}
          <option value={t.id}>{t.name} ({t.discipline})</option>
        {/each}
      </select>
      <button class="add-btn" onclick={() => addTemplate()} disabled={!chosen}>Add</button>
    </div>
    <div class="actions">
      <button class="link" onclick={addAdhoc}>+ Ad-hoc exercise</button>
      <button class="link" onclick={() => (showHistory = !showHistory)} disabled={historyItems.length === 0}>
        {showHistory ? 'Hide history' : '+ From history'}
      </button>
    </div>
    {#if showHistory}
      <div class="history-list">
        {#if historyItems.length === 0}
          <p class="muted">No past exercises to reuse yet.</p>
        {/if}
        {#each historyItems as h (h.key)}
          <button class="hist-row" onclick={() => reuseFromHistory(h.ex)}>
            <span class="hist-name">{h.ex.name}</span>
            <span class="muted">{h.ex.discipline} · {h.date} · {historySummary(h.ex)}</span>
          </button>
        {/each}
      </div>
    {/if}
    {#if suggestions.length}
      <div class="suggest">
        <span class="muted">Goes well with</span>
        {#each suggestions as s (s.id)}
          <button class="chip" onclick={() => addTemplate(s.id)}>+ {s.name}</button>
        {/each}
      </div>
    {/if}
  </section>

  {#if draft.exercises.length === 0}
    <p class="muted center">No exercises yet. Add one from your library above.</p>
  {/if}

  {#each draft.exercises as ex, ei (ex.id)}
    <section class="card exercise">
      <div class="ex-head">
        <input class="ex-name" bind:value={ex.name} />
        <div class="ex-move">
          <button class="link" onclick={() => move(ei, -1)} disabled={ei === 0} aria-label="Move up">↑</button>
          <button class="link" onclick={() => move(ei, 1)} disabled={ei === draft.exercises.length - 1} aria-label="Move down">↓</button>
          <button class="link" onclick={() => removeExercise(ei)} aria-label="Remove exercise">✕</button>
        </div>
      </div>

      {#if ex.goal}<p class="muted goal">{ex.goal}</p>{/if}

      <div class="field">
        <span class="lbl">Discipline</span>
        <select bind:value={ex.discipline} onchange={() => onDiscipline(ex)}>
          {#each DISCIPLINES as d}<option value={d}>{d}</option>{/each}
        </select>
      </div>
      <div class="field">
        <span class="lbl">Sets (repeat)</span>
        <input type="number" min="1" bind:value={ex.set_repeat} />
      </div>

      <div class="reps">
        {#each ex.planned.reps as rep, ri (ri)}
          {@const segs = repSegments(rep.shape ?? 'simple', ex.discipline)}
          <div class="rep">
            <div class="rep-top">
              <span class="rep-n">#{ri + 1}</span>
              <select class="shape" bind:value={rep.shape} onchange={() => onShape(rep, ex)}>
                {#each SHAPES as s}<option value={s.value}>{shapeLabel(s.value, ex.discipline)}</option>{/each}
              </select>
              <button class="link" onclick={() => removeRep(ex, ri)} aria-label="Remove rep">✕</button>
            </div>
            <p class="shape-hint">captures {shapeHint(rep.shape ?? 'simple', ex.discipline)}</p>

            {#if segs.includes('hold') && rep.hold_target}
              <div class="seg">
                <span class="lbl">Hold</span>
                <select class="unit" bind:value={rep.hold_target.unit}>
                  <option value="absolute">mm:ss</option>
                  <option value="pct_pb">% PB</option>
                  <option value="contraction_relative">1C +s</option>
                  <option value="qualitative">qualitative</option>
                </select>
                {#if rep.hold_target.unit === 'absolute'}
                  <MMSS bind:seconds={rep.hold_target.value} />
                {:else if rep.hold_target.unit === 'qualitative'}
                  <select bind:value={rep.hold_target.value}>
                    {#each HOLD_QUAL as q}<option value={q.value}>{q.label}</option>{/each}
                  </select>
                {:else}
                  <input type="number" bind:value={rep.hold_target.value} placeholder={rep.hold_target.unit === 'pct_pb' ? '%' : '+s'} />
                {/if}
              </div>
            {/if}

            {#if segs.includes('distance') && rep.distance_target}
              <div class="seg">
                <span class="lbl">Distance</span>
                <select class="unit" bind:value={rep.distance_target.unit}>
                  <option value="absolute">m</option>
                  <option value="pct_pb">% PB</option>
                  <option value="qualitative">qualitative</option>
                </select>
                {#if rep.distance_target.unit === 'qualitative'}
                  <input bind:value={rep.distance_target.value} placeholder="long but doable" />
                {:else}
                  <input type="number" bind:value={rep.distance_target.value} placeholder={rep.distance_target.unit === 'pct_pb' ? '%' : 'm'} />
                {/if}
              </div>
            {/if}

            {#if segs.includes('distance2') && rep.distance2_target}
              <div class="seg">
                <span class="lbl">Distance 2</span>
                <input type="number" bind:value={rep.distance2_target.value} placeholder="m" />
              </div>
            {/if}

            {#if segs.includes('continuous') && rep.continuous}
              <div class="seg">
                <span class="lbl">Duration</span>
                <MMSS bind:seconds={rep.continuous.duration_s} />
              </div>
              <div class="seg">
                <span class="lbl">Pattern / cadence</span>
                <input bind:value={rep.continuous.pattern} placeholder="square / every 7" />
              </div>
            {/if}

            {#if rep.recovery}
              <div class="seg">
                <span class="lbl recovery-lbl">
                  Recovery
                  <Help>
                    <strong>Recovery type</strong><br />
                    <em>fixed</em> — a set time or number of breaths<br />
                    <em>cap</em> — recover up to a numeric maximum (≤)<br />
                    <em>≤ rule</em> — bounded by a condition, e.g. &lt; swim time<br />
                    <em>qualitative</em> — a feel word (minimal / adequate / full) when you aren't counting
                  </Help>
                </span>
                <select class="unit" bind:value={rep.recovery.type} onchange={() => onRecType(rep)}>
                  <option value="absolute">fixed</option>
                  <option value="cap">cap (≤)</option>
                  <option value="inequality">≤ rule</option>
                  <option value="qualitative">qualitative</option>
                </select>
                {#if rep.recovery.type === 'qualitative'}
                  <select bind:value={rep.recovery.value}>
                    {#each REC_QUAL as r}<option value={r}>{r}</option>{/each}
                  </select>
                {:else if rep.recovery.type === 'inequality'}
                  <input bind:value={rep.recovery.value} placeholder="< swim_time" />
                {:else}
                  {#if rep.recovery.unit === 'breaths'}
                    <input type="number" bind:value={rep.recovery.value} placeholder="breaths" />
                  {:else}
                    <MMSS bind:seconds={rep.recovery.value} />
                  {/if}
                  <select class="unit" bind:value={rep.recovery.unit}>
                    <option value="time">time</option>
                    <option value="breaths">breaths</option>
                  </select>
                {/if}
              </div>
            {/if}

            {#if rep.prep_breathing}
              <p class="muted prep">prep: {rep.prep_breathing.pattern}{rep.prep_breathing.duration_s ? ` · ${rep.prep_breathing.duration_s}s` : ''}</p>
            {/if}
          </div>
        {/each}
        <button class="link addrep" onclick={() => addRep(ex)}>+ Add rep</button>
      </div>
    </section>
  {/each}

  <div class="actions sticky-save">
    <button onclick={() => save('plan')}>{saved ? 'Saved ✓' : 'Save plan'}</button>
    <button class="log-btn" onclick={() => save('log')} disabled={draft.exercises.length === 0}>Log actuals →</button>
  </div>
  <div class="actions">
    <button class="link" onclick={() => setView('sessions')}>Back to sessions</button>
  </div>
</main>
