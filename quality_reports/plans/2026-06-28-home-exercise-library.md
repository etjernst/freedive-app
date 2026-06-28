# Plan: usable Home exercise library (tap-to-use, richer cards, discipline filter)

## Context

Emilia thought she could tap an exercise template on the Home page to "use" it (start a
session from it). She can't: the Home "Exercise library" card
([App.svelte:138-151](file:///C:/git/freedive-app/src/App.svelte)) renders templates as
static `<li>` items with no click handler. The only way to use a template today is the
builder's "Add from library…" dropdown
([SessionBuild.svelte:170-178](file:///C:/git/freedive-app/src/SessionBuild.svelte)). So
this is a missing feature, not a regression.

She also wants the Home cards to carry more detail, a sensible order, and a quick filter
(e.g. show only STA when planning a STA session). This plan covers that Home-library work.
The remaining Phase 2b loose ends (duplicate-and-tweak, promote-logged-to-template, the
DYN 2/17/18 nested-set decision, and verifying compound/generator logging) follow as a
separate chunk with its own short plan, because creating/editing templates needs its own
design choices and new write plumbing.

## Decisions baked in (flagging the two non-obvious ones)

1. Tap action: tapping a card starts a new planned session dated today with that one
   exercise already added, and lands in the builder. Reuses `newSession()` +
   `instantiateExercise()`. (Alternative considered: append to an in-progress draft. Rejected
   — Home has no notion of a current draft; createSession always starts fresh.)

2. Discipline filter chips: `All / STA / Dynamic / Tortuga`. The library has 23 STA, 18
   `any`, 2 DNF, 1 tortuga. The 18 `any` templates are the dynamic exercises (usable across
   DYN/DYNb/DNF; they resolve to a concrete discipline only when added, per
   [session.js:131-160](file:///C:/git/freedive-app/src/lib/session.js)). They carry no
   DYN-vs-DNF distinction, so an honest filter groups them under one "Dynamic" chip rather
   than faking separate DYN/DYNb/DNF buckets. `Dynamic` = discipline in {any, DYN, DYNb, DNF}.

3. Card detail shown: name (prominent), a discipline badge, a role badge when warm-up or
   cool-down, capacity tags, and the one-line `goal` (muted). All fields already exist on
   every template (confirmed against fixtures).

4. Order within the filtered list: role first (warm-up -> main -> cool-down), then name.
   Rationale: a session reads top-to-bottom as warm-up + main + optional cool-down, so this
   ordering matches how she assembles one.

## Changes

### 1. New store action — `src/lib/store.svelte.js`
Add `startSessionWith(templateId)`: find the template in `app.templates`, `newSession()`,
push `instantiateExercise(template)` into its `exercises`, persist to the `sessions` store,
set `currentSessionId`, `refresh()`, set `view = 'session-build'`. Mirrors the existing
`createSession()` (store.svelte.js:81-87) but seeds one exercise. Import `instantiateExercise`
from `./session.js` (currently only `newSession`/`clone` are imported).

### 2. Home library card — `src/App.svelte`
- Add local `$state` for the active discipline filter (default `'all'`) and a `$derived`
  filtered+sorted list off `app.templates`.
- Replace the static `<ul class="library">` with a row of filter chips plus a list of
  tappable cards. Each card is a `<button>` (keyboard/focus friendly) calling
  `startSessionWith(t.id)`; pull `startSessionWith` and `createSession` into the existing
  import from the store.
- Card markup: name, discipline badge (label `any` as "dynamic"), role badge for
  warm-up/cool-down, capacity tags (reuse existing `.tags`), one-line goal.
- Keep an "Open sessions" / "New blank session" affordance so an empty session is still
  one tap away (wire the existing `createSession`).
- Add scoped CSS for chips and cards consistent with the current `.card`/`.tags`/`.muted`
  sage styling. No global style changes.

No schema change, no seed change, no new dependency. Read-only display plus one new session
write that reuses existing persistence.

## Verification

1. `npm run dev`, open http://localhost:5173/freedive-app/ , drive via Chrome automation.
2. Home shows filter chips; clicking `STA` narrows to the 23 STA templates, `Dynamic` to the
   20 dynamic ones, `Tortuga` to 1, `All` restores.
3. Cards show name + discipline + role + tags + goal; warm-ups sort before main before
   cool-down within a filter.
4. Tapping a card lands in the builder with exactly that one exercise pre-added, date = today;
   its reps render without empty-bind errors (builder's `ensureExercise` backfill);
   "Save plan" then "Log actuals" round-trips.
5. No console errors; `npm run build` succeeds.

## After approval
Copy this plan to `quality_reports/plans/2026-06-28-home-exercise-library.md` (workflow
convention) before implementing, then proceed to the Phase 2b loose ends as a separate plan.
