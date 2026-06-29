# Plan: lung volume + pace capture in the log view

Implements spec [2026-06-29-lung-volume-in-log.md](file:///C:/git/freedive-app/quality_reports/specs/2026-06-29-lung-volume-in-log.md).
Confirmed: both lung volume and pace; store quietly (no plan-vs-actual diff UI);
per-rep override plus an exercise-level convenience, mirroring the builder.

Key finding: there is NO session JSON schema. `schema/freedive.schema.json`
validates the seed library (templates) only; the actual-rep shape lives entirely
in JS. So the model change is just the JS object -- no schema-file edit, no
migration, and `schema/validate.py` is unaffected.

## 1. session.js -- model + shared option lists

- Export `LUNG_OPTS` and `SPEED_OPTS` (currently defined inline in
  SessionBuild.svelte) so the builder and log share one definition.
- `blankActualRep`: add `lung_volume: 'FL'` and `pace: null` (explicit, valid
  defaults, same rationale as the planned rep defaulting to FL).
- `seedActual`: seed each actual rep's `lung_volume` / `pace` from its planned rep
  (`expandPlannedSlots` already carries `s.rep`), so a planned-FRC exercise shows
  FRC in the log, editable to record a deviation. Falls back to FL / null when the
  plan has none.

## 2. SessionBuild.svelte -- use the shared lists

- Remove the local `LUNG_OPTS` / `SPEED_OPTS` consts; import them from session.js.
  No behavior change.

## 3. SessionLog.svelte -- capture realized lung volume / pace

- Import `LUNG_OPTS`, `SPEED_OPTS`.
- Load loop (lines 26-29): for each exercise already carrying an actual, backfill
  `ar.lung_volume ??= (planned lung or 'FL')` and `ar.pace ??= (planned pace or
  null)` so existing logged sessions (whose actual reps predate these fields)
  bind cleanly.
- Exercise-level controls (mirror of the builder's `exLung`/`setExLung` etc., but
  writing to `ex.actual.reps`): a Lung volume select (all disciplines) and, when
  `isDynamic(ex.discipline)`, a Speed select. Place them in the per-exercise
  actual block. `setExLung*` writes the value to every actual rep; `setExSpeed*`
  sets pace or clears to null.
- Per-rep override inside the existing rep "More" details block: a Lung volume
  select bound to `ar.lung_volume`, and a Speed select (dynamic only) via a
  `setRepPace`-style setter on `ar`.
- `addRep`: seed the new actual rep's `lung_volume` / `pace` from the
  exercise-level value (mirrors the builder's `addRep`).
- No realized-vs-planned diff shown (store quietly, per decision). The planned
  lung/pace already appears read-only in the rep context line.

## Out of scope (unchanged)

- `set_repeat` vs `termination.n` planned-count ambiguity (separate fix).
- Obsidian export / overview showing realized values (deferred MAY).
- Backfilling the 2026-06-28 session (Emilia can Edit plan; no migration).

## Verification

1. `npm run build` succeeds; `python schema/validate.py` still passes (fixtures
   untouched).
2. Drive the dev server: open a planned session in the log view; the exercise-
   level Lung volume defaults from the plan; changing it writes all reps; a per-
   rep override under "More" sticks; Speed shows only for dynamic exercises.
3. Add an ad-hoc exercise in the log: it has a Lung volume control with an FL
   default; set it to FRC and Save; re-open shows FRC on the actual rep.
4. Set a realized lung volume that differs from the plan; Save; confirm
   `planned.reps` is unchanged and the realized value persists on `actual.reps`.
5. Open an existing pre-change logged session: no crash; controls backfill to FL.
6. No console errors. Commit.
