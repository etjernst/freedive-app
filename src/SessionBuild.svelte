<script>
  import { app, currentSession, saveSession, saveTemplate, setView } from './lib/store.svelte.js'
  import {
    instantiateExercise,
    blankExercise,
    blankRep,
    reuseExercise,
    exerciseToTemplate,
    repSegments,
    shapeHint,
    shapeLabel,
    describeHold,
    describeDistance,
    clone,
    isDynamic,
    plannedRepCount,
    DISCIPLINES,
    SHAPES,
    LUNG_OPTS,
    SPEED_OPTS,
  } from './lib/session.js'
  import { suggestionsFor } from './lib/affinities.js'
  import { LIB_FILTERS, filterLibrary, discLabel, roleLabel } from './lib/library.js'
  import {
    estimateExercise,
    estimateSession,
    fmtDuration,
    needsPlanningReps,
    needsPlanningDistance,
  } from './lib/estimate.js'
  import { openInObsidian } from './lib/obsidian.js'
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
  let saved = $state(false)
  let showHistory = $state(false)
  // Library picker mirrors Home's filter + cards. Open by default on an empty
  // session so adding the first exercise is one tap, not a hunt through a select.
  let showLibrary = $state(clone(currentSession())?.exercises?.length === 0)
  let libFilter = $state('all')
  const libTemplates = $derived(filterLibrary(app.templates, libFilter))

  // Give every shown segment a target object to bind to, so the editor never
  // binds through undefined. Idempotent: only fills what is missing.
  function ensure(rep, discipline) {
    const segs = repSegments(rep.shape ?? 'simple', discipline)
    if (segs.includes('hold') && !rep.hold_target) rep.hold_target = { unit: 'absolute', value: null }
    if (segs.includes('distance') && !rep.distance_target) rep.distance_target = { unit: 'absolute', value: null }
    if (segs.includes('distance2') && !rep.distance2_target) rep.distance2_target = { unit: 'absolute', value: null }
    if (segs.includes('continuous') && !rep.continuous) rep.continuous = { duration_s: null, pattern: '' }
    if (!rep.recovery) rep.recovery = { type: 'absolute', value: null, unit: 'time' }
    if (rep.lung_volume == null) rep.lung_volume = 'FL'
    return rep
  }
  function ensureExercise(ex) {
    for (const rep of ex.planned.reps) ensure(rep, ex.discipline)
  }
  // Seed-time pass so reloaded sessions render without a flash of empty binds.
  // Also backfill fields added after a session was first saved.
  for (const ex of draft.exercises) {
    ex.medium ??= 'wet'
    ex.plan_estimate ??= { reps: null, distance_m: null }
    ex.plan_note ??= ''
    ensureExercise(ex)
  }
  draft.session_remarks ??= ''

  const sessionEstimate = $derived(estimateSession(draft, app.settings))

  function addTemplate(id) {
    const t = app.templates.find((x) => x.id === id)
    if (!t) return
    const ex = instantiateExercise(t)
    ensureExercise(ex)
    draft.exercises = [...draft.exercises, ex]
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
    const n = plannedRepCount(ex)
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
  // Exercise-level lung volume / speed: a convenience that reads the first rep
  // and writes all reps, with per-rep overrides available under "More options".
  function exLung(ex) {
    return ex.planned.reps[0]?.lung_volume ?? 'FL'
  }
  function setExLung(ex, v) {
    ex.planned.reps = ex.planned.reps.map((r) => ({ ...r, lung_volume: v }))
  }
  function exSpeed(ex) {
    return ex.planned.reps[0]?.pace ?? ''
  }
  function setExSpeed(ex, v) {
    ex.planned.reps = ex.planned.reps.map((r) => {
      const n = { ...r }
      if (v) n.pace = v
      else delete n.pace
      return n
    })
  }
  function setRepPace(rep, v) {
    if (v) rep.pace = v
    else delete rep.pace
  }
  let repMore = $state({})

  // Adding a rep duplicates the last one (targets, recovery, lung, pace), so a
  // table extends with a tweak instead of a re-entry; blank only when empty.
  function addRep(ex) {
    const last = ex.planned.reps[ex.planned.reps.length - 1]
    let rep
    if (last) {
      rep = clone(last)
    } else {
      rep = ensure(blankRep(ex.shape_default ?? 'simple'), ex.discipline)
      rep.lung_volume = exLung(ex)
      const sp = exSpeed(ex)
      if (sp) rep.pace = sp
    }
    ex.planned.reps = [...ex.planned.reps, rep]
  }
  function removeRep(ex, i) {
    ex.planned.reps = ex.planned.reps.filter((_, j) => j !== i)
  }
  function moveRep(ex, i, dir) {
    const j = i + dir
    if (j < 0 || j >= ex.planned.reps.length) return
    const next = [...ex.planned.reps]
    ;[next[i], next[j]] = [next[j], next[i]]
    ex.planned.reps = next
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

  function toObsidian() {
    openInObsidian($state.snapshot(draft), app.settings)
  }

  // Save the (possibly tweaked) exercise to the library as a new template. The
  // builder is the editor, so this covers both duplicate-and-tweak and promoting
  // an ad-hoc exercise. Always a new name, never overwrites an existing one.
  let tmplSaved = $state(null)
  async function saveAsTemplate(ex) {
    const name = prompt('Save as a new library exercise.\nName:', ex.name)
    if (!name || !name.trim()) return
    await saveTemplate(exerciseToTemplate($state.snapshot(ex), name.trim()))
    tmplSaved = ex.id
    setTimeout(() => { if (tmplSaved === ex.id) tmplSaved = null }, 1500)
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
    <textarea
      class="remarks"
      rows="2"
      placeholder="Session notes / plan for the day"
      bind:value={draft.session_remarks}
    ></textarea>
    <div class="actions">
      <button class="link" onclick={() => (showLibrary = !showLibrary)}>
        {showLibrary ? 'Hide library' : '+ From library'}
      </button>
      <button class="link" onclick={addAdhoc}>+ Ad-hoc exercise</button>
      <button class="link" onclick={() => (showHistory = !showHistory)} disabled={historyItems.length === 0}>
        {showHistory ? 'Hide history' : '+ From history'}
      </button>
    </div>
    {#if showLibrary}
      <div class="filters">
        {#each LIB_FILTERS as f (f.key)}
          <button class="chip" class:active={libFilter === f.key} onclick={() => (libFilter = f.key)}>
            {f.label}
          </button>
        {/each}
      </div>
      <div class="lib-list">
        {#each libTemplates as t (t.id)}
          <button class="lib-card" onclick={() => addTemplate(t.id)}>
            <span class="lib-top">
              <span class="name">{t.name ?? t.id}</span>
              <span class="badges">
                <span class="disc">{discLabel(t.discipline)}</span>
                {#if roleLabel(t.role)}<span class="role">{roleLabel(t.role)}</span>{/if}
              </span>
            </span>
            {#if t.capacity_tags?.length}
              <span class="tags">{t.capacity_tags.join(' · ')}</span>
            {/if}
            {#if t.goal}<span class="lib-goal muted">{t.goal}</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
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
    {@const est = estimateExercise(ex, app.settings)}
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
      <textarea
        class="plan-note"
        rows="2"
        placeholder="Notes / instructions to yourself"
        bind:value={ex.plan_note}
      ></textarea>
      <p class="est" class:est-unknown={est.seconds == null}>
        {est.seconds != null ? `Est. ${fmtDuration(est.seconds)}` : `Est. — ${est.reason}`}
      </p>

      <div class="field">
        <span class="lbl">Discipline</span>
        <select bind:value={ex.discipline} onchange={() => onDiscipline(ex)}>
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
        <span class="lbl">Sets (repeat)</span>
        <input type="number" min="1" bind:value={ex.set_repeat} />
      </div>
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
      {#if needsPlanningReps(ex)}
        <div class="field">
          <span class="lbl">Expected reps <span class="muted">(time est.)</span></span>
          <input type="number" min="1" bind:value={ex.plan_estimate.reps} placeholder="e.g. 8" />
        </div>
      {/if}
      {#if needsPlanningDistance(ex)}
        <div class="field">
          <span class="lbl">Expected distance (m) <span class="muted">(time est.)</span></span>
          <input type="number" min="1" bind:value={ex.plan_estimate.distance_m} placeholder="e.g. 75" />
        </div>
      {/if}

      <div class="reps">
        {#each ex.planned.reps as rep, ri (ri)}
          {@const segs = repSegments(rep.shape ?? 'simple', ex.discipline)}
          <div class="rep">
            <div class="rep-top">
              <span class="rep-n">#{ri + 1}</span>
              <select class="shape" bind:value={rep.shape} onchange={() => onShape(rep, ex)}>
                {#each SHAPES as s}<option value={s.value}>{shapeLabel(s.value, ex.discipline)}</option>{/each}
              </select>
              <button class="link" onclick={() => moveRep(ex, ri, -1)} disabled={ri === 0} aria-label="Move rep up">↑</button>
              <button class="link" onclick={() => moveRep(ex, ri, 1)} disabled={ri === ex.planned.reps.length - 1} aria-label="Move rep down">↓</button>
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

            {#if rep.recovery && !((ex.set_repeat ?? 1) <= 1 && ri === ex.planned.reps.length - 1)}
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

            <button class="link rep-more" onclick={() => (repMore[`${ei}-${ri}`] = !repMore[`${ei}-${ri}`])}>
              {repMore[`${ei}-${ri}`] ? 'Less' : 'More options'}
            </button>
            {#if repMore[`${ei}-${ri}`]}
              <div class="seg">
                <span class="lbl">Lung volume</span>
                <select bind:value={rep.lung_volume}>
                  {#each LUNG_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
                </select>
              </div>
              {#if isDynamic(ex.discipline)}
                <div class="seg">
                  <span class="lbl">Speed</span>
                  <select value={rep.pace ?? ''} onchange={(e) => setRepPace(rep, e.currentTarget.value)}>
                    {#each SPEED_OPTS as o}<option value={o.value}>{o.label}</option>{/each}
                  </select>
                </div>
              {/if}
            {/if}

            {#if rep.prep_breathing}
              <p class="muted prep">prep: {rep.prep_breathing.pattern}{rep.prep_breathing.duration_s ? ` · ${rep.prep_breathing.duration_s}s` : ''}</p>
            {/if}
          </div>
        {/each}
        <button class="link addrep" onclick={() => addRep(ex)}>+ Add rep</button>
      </div>
      <div class="actions">
        <button class="link" onclick={() => saveAsTemplate(ex)}>
          {tmplSaved === ex.id ? 'Saved to library ✓' : 'Save as template'}
        </button>
      </div>
    </section>
  {/each}

  {#if draft.exercises.length > 0}
    <p class="session-est">
      Estimated session: <strong>{fmtDuration(sessionEstimate.seconds) ?? '—'}</strong>{sessionEstimate.uncertain ? ' + unestimated exercises' : ''}
    </p>
  {/if}

  <div class="actions sticky-save">
    <button onclick={() => save('plan')}>{saved ? 'Saved ✓' : 'Save plan'}</button>
    <button class="log-btn" onclick={() => save('log')} disabled={draft.exercises.length === 0}>Log actuals →</button>
  </div>
  <div class="actions">
    <button class="link" onclick={toObsidian} disabled={draft.exercises.length === 0}>Add to Obsidian</button>
    <button class="link" onclick={() => setView('sessions')}>Back to sessions</button>
  </div>
</main>
