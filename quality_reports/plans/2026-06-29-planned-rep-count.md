# Plan: planned rep count -- single source of truth (Option C)

Implements spec [2026-06-29-planned-rep-count.md](file:///C:/git/freedive-app/quality_reports/specs/2026-06-29-planned-rep-count.md).
Confirmed: Option C (listed reps are the truth); leave logged history untouched.

## The canonical rule

Planned rep count is ALWAYS `planned.reps.length x set_repeat`. Nothing reads a
count out of `termination`. `termination` describes only how a set ENDS:
`until_failure` / `until_1c` / `until_utb` / `until_quality_drops` (open-ended,
timed via `plan_estimate.reps`), `range` (midpoint), `duration_capped` (a time
cap), or `fixed_n` (a fixed prescribed sequence -- with NO `n`, since the count
lives in the reps). This removes the second count field entirely, so the
2026-06-28 kind of `set_repeat=5` / `n=6` conflict can no longer be represented.

Encoding choice per table:
- reps that VARY across the set (changing recovery / hold / distance) -> list them
  as explicit rep rows (`reps.length = N`, `set_repeat = 1`).
- reps that are IDENTICAL across the set -> one rep row with `set_repeat = N`.
Both yield the same `reps.length x set_repeat`, so the count is unambiguous either
way; the choice is just authoring clarity.

## 1. build_library.py -- fix the seven fixed_n tables

Currently `fixed_n n>1` with a single placeholder rep (count never expands):

| id | n | reps vary? | encode as | source to read |
|----|---|-----------|-----------|----------------|
| sta-co2-short-intense | 6 | no (constant hold, 2-breath rec) | 1 rep, set_repeat 6 | STA note |
| dyn-sweet16 | 16 | no (constant leg) -- verify | 1 rep, set_repeat 16 | DYN note |
| sta-co2-decreasing-rec | 7 | yes (recovery shrinks) | 7 listed rows | STA note |
| sta-progressive-fl | 3 | yes (hold grows) | 3 listed rows | STA note |
| sta-1c-plus | 5 | yes (1C+X ladder, +10s step) | 5 listed rows | STA note |
| sta-el | 5 | yes (EL ladder, increasing) -- verify | 5 listed rows | STA note |
| dyn-descending | 3 | yes (distance descends) | 3 listed rows | DYN note |

For each: author the real rows in the `REPS` map (mirroring the existing
`dyn-broken-200` / `dyn-frc-sprint` style), pulling exact holds / distances /
recoveries from the canonical Obsidian notes (`STA Exercise library
freediving.md`, `DYN exercise library freediving.md`) -- not from memory. Set
`SET_REPEAT[cid]` for the identical-rep tables. Carry lung volume / pace per rep
where the table specifies it (e.g. sta-el is EL/RV).

`termination`: drop `n` from every `fixed_n` entry. Change the default from
`{"type": "fixed_n", "n": 1}` to `{"type": "fixed_n"}`. Leave `until_*`, `range`,
`duration_capped` untouched.

Add a build-time assertion: no emitted template has `termination.type == 'fixed_n'`
with an `n` key (guards against the convention drifting back).

Regenerate: `python seed/build_library.py`, then `python schema/validate.py`.
Do not hand-edit `fixtures.json` or the xlsx.

## 2. schema/freedive.schema.json

`termination.n` stays allowed (open/range may still use counts), so existing
validation passes. Optionally tighten later; not required for this change.

## 3. App code -- centralize the count, drop the dead default n

- session.js: add `plannedRepCount(ex) = (ex.planned?.reps?.length ?? 0) *
  Math.max(1, ex.set_repeat ?? 1)`. Route the inlined `reps.length x set_repeat`
  sites through it: the builder history summary
  ([SessionBuild.svelte:118](file:///C:/git/freedive-app/src/SessionBuild.svelte))
  and anywhere else the same expression appears. `expandPlannedSlots` already is
  this formula (keep it as the slot builder; have it and `plannedRepCount` agree).
- session.js: change the default terminations in `instantiateExercise`,
  `blankExercise`, and `exerciseToTemplate` from `{ type: 'fixed_n', n: 1 }` to
  `{ type: 'fixed_n' }`, so the app stops writing a dead `n` too. (estimate.js
  branches on `termination.type`, never reads `n` for fixed_n, so no estimate
  change.)

## 4. Reaching seeded devices

The corrected templates are canon, so they reach Emilia's phone via Settings ->
"Refresh library from latest" (id-scoped overwrite; her saved/ad-hoc templates
untouched). Sessions already built keep their frozen snapshot -- history stays as
logged, per decision.

## Out of scope

- The `fixed_n n=1` placeholders that are really multi-rep (dyn-pyramid,
  dyn-inverse-pyramid, dyn-elastic-sprint-max): left as single editable reps.
  Flag to Emilia as a possible follow-up if she wants pyramids pre-built.
- A planned-vs-completed readout (spec A1): separate, later.
- Rewriting the 2026-06-28 session: untouched.

## Verification

1. `python seed/build_library.py` runs; `python schema/validate.py` passes (44+
   templates conform).
2. Inspect fixtures: each former `fixed_n n>1` table now has either N listed rows
   or `set_repeat = N`; no `fixed_n` carries `n`; `reps.length x set_repeat`
   equals the intended count for each.
3. `npm run build` succeeds.
4. Drive the dev app: build a "Short & intense CO2" and a "decreasing rec" from the
   library; confirm the log scaffolds the right number of slots with NO manual
   "Sets" retyping, and the overview / estimate agree on the count.
5. Spot-check that `plannedRepCount` and `expandPlannedSlots(...).length` match for
   a listed-rep table and a compact-repeat table.
6. Commit; push only on Emilia's say-so.
