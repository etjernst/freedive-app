# Plan: in-app plan overview + top-of-log thoughts capture

Implements spec [2026-06-29-in-app-overview-and-capture.md](file:///C:/git/freedive-app/quality_reports/specs/2026-06-29-in-app-overview-and-capture.md).
Confirmed scope: log view only; thoughts field at the top; overview directly
below it; no collapse toggle.

## Target layout (SessionLog.svelte, top to bottom)

1. Thoughts card (new) -- a prominent textarea bound to `draft.session_remarks`,
   labeled for post-dive dictation. First thing in the view.
2. Plan overview card (new) -- read-only, glanceable summary of the whole plan.
3. Date + add-exercise card (existing, unchanged, moves below the two new cards).
4. Exercise logging cards (existing, unchanged).
5. Bottom Session card: keep Overall feel; REMOVE its now-duplicate
   `session_remarks` textarea (moved to the top).
6. Save actions + Edit plan / Back (existing, unchanged).

## Changes

### 1. Shared plan-line helper (so overview and export never disagree) -- M1

The compact per-rep plan line currently lives only in `obsidian.js` as the
private `repLine`. Extract it so both the export and the new overview render
identically.

- Move the rep-line logic into `src/lib/session.js` as an exported
  `planRepLine(rep, ex, isLast)` (returns the single-line string: phases joined
  with the existing arrow, lung volume when not full lung, pace when set, and
  trailing-recovery-dropped-for-single-set rule preserved). It already depends
  only on `repSegments` + `describe*`, all in session.js, so no circular import.
- `obsidian.js`: delete its local `repLine`, import `planRepLine` from session.js,
  call it from `exerciseBlock`. No output change to the export.

### 2. Plan-overview builder -- M1, S4

- Add an exported pure helper (in session.js, beside `planRepLine`):
  `planOverview(session)` returns, per exercise:
  `{ id, name, sets, lines: string[], note, logged }` where
  - `lines` = `planned.reps.map((r,i) => planRepLine(r, ex, i === last))`
  - `sets` = `set_repeat` (shown as "x N" only when > 1)
  - `note` = `plan_note`
  - `logged` = true when any `actual.reps[*]` has a realized primary value
    (`hold_s`, `distance_m`, `distance2_m`, or `duration_s` non-null). Display
    only; derived, never stored.

### 3. SessionLog.svelte

- Import `planOverview` (and nothing else new beyond what is needed).
- Render the Thoughts card at the very top of `<main>`:
  `<textarea bind:value={draft.session_remarks}>` with a clear label/placeholder
  ("How did it go? -- dictate your thoughts"). The phone mic works in any
  textarea, so no new input mechanism.
- Render the Plan overview card below it: `{#each planOverview(draft) as ov}` ->
  exercise name (+ "x N sets" when `sets > 1`), a small logged/ to-do marker
  (S4), each `ov.lines` entry as a read-only line, and `ov.note` when present.
  Read-only; no inputs.
- Remove the duplicate `session_remarks` textarea from the bottom Session card
  (keep the Overall feel select there).

### 4. app.css

- Minimal styles: `.overview` (compact read-only list, smaller type, clear
  per-exercise grouping), the logged/ to-do marker, and the top Thoughts card so
  it reads as the primary capture target. Reuse existing `.card` / `.muted`
  patterns; no new design language.

## Out of scope (unchanged here)

- Obsidian export content/placement and its numbered-duplicate behavior.
- Session schema meaning, estimation, actual storage shape.
- The set_repeat-vs-termination.n count ambiguity and missing lung_volume/pace on
  logged reps (separate data-model follow-up).

## Verification

1. `npm run dev`; drive http://localhost:5173/freedive-app/ via Chrome.
2. Seed a planned + part-logged session in the dev IndexedDB (reuse the shape
   from the 2026-06-28 backup), open it in the log view.
3. M1: overview lines match what the Obsidian export produces for the same
   session (compare `planRepLine` output to the exported note for one exercise).
4. M2/S4: overview is visible without scrolling the form; logged exercises show
   the logged marker, unlogged show to-do.
5. M3: the top Thoughts textarea is reachable without scrolling; typing into it
   then Save persists to `session_remarks` (re-open confirms); the bottom no
   longer has a second remarks box.
6. M4: per-rep fields, Save, Save & close, Edit plan still work; saved session
   JSON shape is unchanged (diff a saved doc against the pre-change shape).
7. `npm run build` succeeds; no console errors.
8. Review pass (critic on the changed Svelte/JS), then commit.
