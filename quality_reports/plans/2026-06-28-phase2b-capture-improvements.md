# Plan: Phase 2b loose ends + capture-flow improvements

## Context

While planning a real DNF session for tomorrow (a max dive simulator: 100m/2RB,
40m/3RB, max), Emilia hit several gaps. This plan bundles the fixes she confirmed,
plus the remaining Phase 2b loose ends, ordered so the things that help tomorrow's
session land first. Decisions below are all confirmed in chat.

Phase A (helps tomorrow): bring the Home library filters into the session builder,
per-exercise notes, recovery-after-final-effort fix, "Add to Obsidian" export, remove
"active safety" + a "Refresh library" action.
Phase B (loose ends): unified "Save as new template", and closing the nested-set
and compound-logging questions.

Out of scope (Emilia flagged as likely overkill, revisit later): standalone
"recovery blocks" you can drop between sets within a session; a one-tap "max"
distance target (typing "max" into a qualitative distance already works).

---

## Phase A

### A1. Filtered library picker inside the builder
The builder's only way to add a library exercise is the "Add from library…" `<select>`
([SessionBuild.svelte:170-178](file:///C:/git/freedive-app/src/SessionBuild.svelte)),
which is overwhelming and hides what each exercise means. Bring the same Home filter
chips + tappable cards into the builder so picking an exercise is filterable and shows
name/discipline/goal.
- Factor the Home filter logic into a shared helper `src/lib/library.js`:
  `LIB_FILTERS`, `matchesFilter(t, key)`, and a `sortLibrary(list)` (warm-up -> main ->
  cool-down, then name). Import it in both `App.svelte` (replacing the inline copy added
  earlier) and `SessionBuild.svelte`.
- In `SessionBuild.svelte`, add chips + a compact card list above/replacing the select;
  tapping a card calls the existing `addTemplate(id)`
  ([SessionBuild.svelte:67-74](file:///C:/git/freedive-app/src/SessionBuild.svelte)).
  Keep the card styling from `app.css` (`.lib-card`, `.filters`, badges).
- Keep ad-hoc / from-history / "goes well with" as they are.

### A2. Per-exercise notes / instructions field
A free-text note on each exercise, editable in the builder, shown in build and log
views, and included in the Obsidian export.
- Model: add `plan_note` (string) to `instantiateExercise` and `blankExercise`
  ([session.js:131-194](file:///C:/git/freedive-app/src/lib/session.js)); backfill
  `ex.plan_note ??= ''` in the builder's load loop
  ([SessionBuild.svelte:59-63](file:///C:/git/freedive-app/src/SessionBuild.svelte)).
- UI: a small textarea in the exercise card in `SessionBuild.svelte`, and read-only
  display in `SessionLog.svelte`. Also surface the existing session-level
  `session_remarks` in the builder (currently only in the log).
- No schema break: `plan_note` is additive and optional.

### A3. Recovery after the final effort (rule (a))
When `set_repeat === 1`, the recovery that follows the *last* rep leads nowhere, so
hide it in the builder and exclude it from the time estimate. Recovery between earlier
reps (the 2RB/3RB between phases) is kept and still counts.
- Builder: in the reps loop, render the recovery `.seg` unless
  `(ex.set_repeat ?? 1) <= 1 && ri === ex.planned.reps.length - 1`
  ([SessionBuild.svelte:329-365](file:///C:/git/freedive-app/src/SessionBuild.svelte)).
- Estimate: in `estimateExercise` ([estimate.js:132-161](file:///C:/git/freedive-app/src/lib/estimate.js)),
  when `sets === 1`, subtract the final rep's recovery from the block sum (the common
  `blk.sec * sets` path). Cleanest: have `blockSeconds` also return the last rep's
  recovery seconds so the caller can drop it; leave the open-ended/range perRep paths
  approximate (recovery is a minor term there). Already not required to save, so no
  save-path change.

### A4. "Add to Obsidian" export of the planned session
A button (in `SessionBuild.svelte`, near the save actions) that hands the session to
Obsidian via the `obsidian://new` URL scheme---works on desktop and Android without
filesystem access.
- New `src/lib/obsidian.js`: `sessionToMarkdown(session, settings)` returns
  `{ filename, content }`, and `openInObsidian(session, settings)` builds and opens
  the URI. Reuse `describeHold` / `describeDistance` / `describeRecovery`
  ([session.js:264-308](file:///C:/git/freedive-app/src/lib/session.js)) to render targets.
- Filename: `Training log <session.date>` (date is already `YYYY-MM-DD`).
- Markdown matches her existing vault format (verified against
  `Training log 2026-02-15.md`): frontmatter `type: training`, `date`, `environment`,
  `disciplines: [...]` (unique across exercises), `source: winnow`; then a `[[Freediving]]`
  link; then a `## <DISCIPLINE>` section per discipline; under each, one block per
  exercise with its name, phases/targets, recovery, and `plan_note`.
- URI: `obsidian://new?vault=EmiliaNotes&file=<enc>&content=<enc>` (vault folder is
  `C:\Users\maand\Documents\EmiliaNotes`). No `overwrite`/`append`, so re-exporting the
  same day creates a safe numbered copy rather than clobbering. Trigger by setting
  `window.location.href` to the URI (a normal hand-off, not a popup).

### A5. Remove "active safety" + Refresh-library action
- Source edit (Emilia approved this specific text change): drop ". Active safety" from
  the max-simulator goal in
  [build_library.py:129](file:///C:/git/freedive-app/seed/build_library.py), then rerun
  `python seed/build_library.py` and `python schema/validate.py` to regenerate
  `seed/fixtures.json` (+ the xlsx).
- Because the seed is merge-on-load and never overwrites existing templates
  ([seed.js:4-29](file:///C:/git/freedive-app/src/lib/seed.js)), this won't reach her
  already-seeded phone. Add a "Refresh library from latest" action (Settings, near
  Backup) that `put`s every `fixtures.templates` entry by id (overwriting canon),
  while leaving templates whose id is NOT in fixtures untouched (i.e. her saved/ad-hoc
  templates from B1). New store action `refreshLibrary()` in
  [store.svelte.js](file:///C:/git/freedive-app/src/lib/store.svelte.js); confirm before
  running since it replaces canon definitions.

---

## Phase B

### B1. Unified "Save as new template"
One feature, two entry points (this is the merge of old loose-ends 1 and 2):
- A "Save as template" button on each library card (duplicate-and-tweak: clone an
  existing template) and on an exercise inside a session (promote a built/ad-hoc one).
- Always requires a new name; never overwrites (generate a fresh template id, the same
  `uid('tmpl')` style as `uid` in [session.js:100-106](file:///C:/git/freedive-app/src/lib/session.js)).
- New store action `saveTemplate(template)` writing to the `templates` store (mirror of
  `saveSession`, clone at the boundary to strip `$state` proxies), then `refresh()`.
- Maps a session exercise back to a template shape: keep `planned.reps` as `reps`, drop
  `actual`/instance ids, keep name/discipline/tags/goal/`plan_note`.
- Backup already includes templates, so saved templates export to file/Dropbox with no
  extra work. The Refresh-library action (A5) is id-scoped so it never touches these.

### B2. Close the nested-set decision (DYN 2/17/18)
Resolve as: flatten heterogeneous blocks into explicit rep rows with `set_repeat` for
the outer repeat; no recursive group node. Record this in the build_library docstring.
Optionally encode the real multi-row reps for `dyn-frc-sprint`
(`[FRC-50, sprint-25 ×6]`, set_repeat 2), `dyn-broken-200` (`75 / 50 / 25 ×3`), and
`dyn-max-simulator` in `build_library.py` so fresh installs get them; existing devices
pick them up via Refresh-library (A5). Sprints labeled as sprints (Emilia's correction).

### B3. Close compound-logging verification
Verified by Emilia: the log leaf already gives a field per part for the simulated max
and start-stop shapes. Mark done; no code.

---

## Verification
1. `npm run dev`; drive via Chrome against http://localhost:5173/freedive-app/.
2. A1: in the builder, the filter chips narrow the library; tapping a card adds that
   exercise. Home still works (shared helper).
3. A2: build a session, add a per-exercise note, confirm it shows in build + log.
4. A3: build the max simulator (100m/2RB, 40m/3RB, max) with set_repeat 1---recovery
   field is gone on the final "max" rep, present on the first two; session estimate does
   not count a trailing recovery. Set set_repeat 2---recovery reappears on the last rep.
5. A4: tap "Add to Obsidian", confirm Obsidian opens and creates `Training log
   2026-06-29` with frontmatter, `[[Freediving]]`, a `## DNF` section, the three phases,
   and the note. (Test the markdown string in console first; then the live URI.)
6. A5: edit goal, regenerate, `python schema/validate.py` passes; "Refresh library"
   updates the seeded max-simulator goal on a browser that already had the old text,
   without deleting a manually saved template.
7. B1: save a template from a library card and from a session exercise; both require a
   new name, appear on Home, survive an export/restore round-trip, and are untouched by
   Refresh-library.
8. `npm run build` succeeds; no console errors. Copy this plan to
   `quality_reports/plans/2026-06-28-phase2b-capture-improvements.md`.
