<script>
  import { discLabel, roleLabel } from './library.js'
  import { instantiateExercise, planRepLine, describeRecovery } from './session.js'

  // One library exercise as a card. Tapping the body toggles a read-only
  // preview in place; the button inside the preview (and, when `quick` is
  // set, a round "+" on the card) performs the caller's action, so browsing
  // never adds anything by accident.
  let { t, open = false, ontoggle, onact, actLabel = 'Add to session', acted = false, quick = false } = $props()

  const TERMINATION_LABELS = {
    until_failure: 'until failure',
    until_quality_drops: 'until quality drops',
    duration_capped: 'capped duration',
  }
  // Render the template through the same plan-line helper the log overview
  // uses, via a throwaway instantiation; nothing here is persisted.
  function templateOverview(t) {
    const ex = instantiateExercise(t)
    const reps = ex.planned.reps
    const rest = ex.recovery_inter ? describeRecovery(ex.recovery_inter) : null
    const lines = reps.map((r, i) => planRepLine(r, ex, i === reps.length - 1))
    return {
      sets: ex.set_repeat ?? 1,
      // A lone target-less rep says nothing; the cues carry such exercises.
      lines: lines.length === 1 && lines[0] === '—' ? [] : lines,
      until: TERMINATION_LABELS[ex.termination?.type] ?? null,
      rest: rest && rest !== '—' ? rest : null,
      cues: ex.cues ? readableCues(ex.cues) : null,
      note: ex.plan_note,
    }
  }
  // The library stores the tunable options as "knob (def X); knob (def Y)."
  // Show them as a labeled list with "def" spelled out.
  function readableCues(cues) {
    return cues
      .replace(/\.\s*$/, '')
      .split(/;\s*/)
      .map((c) => c.replace(/\(def\s+/g, '(default '))
      .join(' · ')
  }
</script>

<div class="lib-card" class:open>
  <div class="lib-row">
    <button class="lib-body" onclick={ontoggle} aria-expanded={open}>
      <span class="lib-top">
        <span class="name">{t.name ?? t.id}</span>
        <span class="badges">
          <span class="disc">{discLabel(t.discipline)}</span>
          {#if roleLabel(t.role)}<span class="role">{roleLabel(t.role)}</span>{/if}
        </span>
      </span>
      {#if t.capacity_tags?.length || t.phase_tags?.length}
        <span class="tags">
          {#each t.capacity_tags ?? [] as tag}<span class="tag tag-cap">{tag}</span>{/each}
          {#each t.phase_tags ?? [] as tag}<span class="tag tag-phase">{tag}</span>{/each}
        </span>
      {/if}
      {#if t.goal}<span class="lib-goal muted">{t.goal}</span>{/if}
    </button>
    {#if quick}
      <button class="lib-add" class:done={acted} onclick={onact} aria-label={actLabel} title={actLabel}>
        {acted ? '✓' : '+'}
      </button>
    {/if}
  </div>
  {#if open}
    {@const ov = templateOverview(t)}
    <div class="lib-preview">
      {#if ov.sets > 1 || ov.rest || ov.until}
        <div class="lp-sets">
          {[ov.sets > 1 ? `×${ov.sets} sets` : null, ov.until, ov.rest ? `rest ${ov.rest}` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>
      {/if}
      {#each ov.lines as line}<div class="lp-line">{line}</div>{/each}
      {#if ov.cues}<div class="lp-note"><span class="lp-label">Adjustable:</span> {ov.cues}</div>{/if}
      {#if ov.note}<div class="lp-note">{ov.note}</div>{/if}
      <div class="actions">
        <button onclick={onact}>{acted ? 'Added ✓' : actLabel}</button>
      </div>
    </div>
  {/if}
</div>
