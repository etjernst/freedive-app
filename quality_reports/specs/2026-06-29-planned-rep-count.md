# Spec: a single source of truth for the planned rep count

## Why

An exercise's planned rep count can be expressed three ways, with nothing keeping
them in sync:

1. `planned.reps.length` -- the listed rep rows.
2. `set_repeat` -- how many times the rep block repeats.
3. `termination.n` (for `type: 'fixed_n'`) -- a count the library generator fills in.

What the running code actually reads:

- `expandPlannedSlots` (builds the log slots, seeds actuals): `reps.length x
  set_repeat`. Ignores `termination.n`.
- `estimateExercise`: a `fixed_n` exercise falls through to `blockSeconds x
  set_repeat`; `termination.n` is never used. `termination` only drives the
  open-ended cases (`until_failure` etc. via `plan_estimate.reps`), `range`
  (via `n_min`/`n_max`), and `duration_capped` (via `duration_s`).
- the plan overview, the Obsidian export, and the builder's history summary: all
  use `reps.length x set_repeat`.

So for `fixed_n`, `termination.n` is dead metadata. The library
(`build_library.py`) sets, e.g., `sta-co2-short-intense -> fixed_n n=6` with the
comment "to be expanded when the user builds the session", but the build/expansion
path reads `set_repeat` (left at the default 1), so the 6 never flows. The user
must retype the count into the builder's "Sets" box -- which is how the
2026-06-28 "Short & intense CO2" ended up with `set_repeat = 5` AND
`termination.n = 6`, disagreeing, with the slot scaffold trusting the 5.

Consequence: any planned-vs-completed analysis (completion rate, "planned 6,
did 3") reads an ambiguous or wrong denominator. This is the parked data-model
item from the 2026-06-28 review.

## The decision this spec exists to make

Pick ONE canonical representation of "how many reps were planned," give
`set_repeat` and `termination` clear non-overlapping jobs, and route every
count-consuming site through a single helper so they can never disagree again.

Three candidate models (the crux -- needs Emilia's pick):

- Option C (recommended) -- listed reps are the source of truth.
  `planned.reps` is the literal rep sequence; `set_repeat` repeats that whole
  sequence; total = `reps.length x set_repeat`. `termination` describes only how a
  set ENDS for non-fixed cases (open-ended, range, duration-capped). For
  `fixed_n`, the count lives in the listed reps, not in `n`. This matches the
  vocabulary note that explicitly-numbered ladders (CO2/O2 tables) list their
  reps, and it fits reality: those tables have per-hold changing recovery, so they
  are genuinely N distinct reps, not one rep x N. The library is the main thing
  that changes (expand the fixed_n single-rep tables into listed rows); the
  app's count machinery already computes `reps.length x set_repeat`.

- Option B -- fold the count into `set_repeat` at instantiation.
  When a template has a single-rep block and `fixed_n n=K`, set `set_repeat = K`
  on instantiation so downstream (which already reads `set_repeat`) is correct and
  the two cannot conflict. Minimal code, but conflates "sets" with "reps in a set"
  (a CO2 table reads as 6 sets of 1), and keeps the verbose-vs-listed question open.

- Option A -- `termination` is the source of truth, `set_repeat` repeats the set.
  Make `expandPlannedSlots`/estimate derive the per-set count from `termination`
  (n for fixed_n, midpoint for range, `plan_estimate.reps` for open). Most faithful
  to the generator's intent, but ambiguous when reps are also listed (m>1 AND n>1),
  and touches the most code.

## MUST

- M1. One shared authority for the planned slot list / count, e.g.
  `plannedRepCount(ex)` and the existing `expandPlannedSlots(ex)`, used by the log
  scaffold, the overview "x N", the estimate, and the history summary. No site
  computes the count its own way. [CLEAR once the model is chosen]
- M2. `set_repeat` and `termination` have documented, non-overlapping meanings, and
  a `fixed_n` exercise cannot carry a count that disagrees with the rep machinery
  (either because the count lives in one place, or because instantiation
  reconciles them). [CLEAR once the model is chosen]
- M3. The library (`build_library.py` -> `fixtures.json`) is made consistent with
  the chosen model and regenerated; `schema/validate.py` passes. No hand-edits to
  `fixtures.json`. [CLEAR]
- M4. The builder shows, and lets the user set, the count in one obvious place that
  matches what gets logged (no more "the Sets box secretly is the count"). [CLEAR]

## SHOULD

- S1. Existing sessions with a `set_repeat`/`termination.n` conflict (the
  2026-06-28 one) are interpreted by a stated rule -- e.g. on load, trust the
  listed/`set_repeat` slots already logged and leave history untouched, fixing
  forward only. No silent rewrite of logged data. [NEEDS CONFIRMATION: leave
  history as-is vs normalize on next open.]
- S2. If a `fixed_n n` is kept as descriptive metadata, validation (or a dev-time
  check) flags when it disagrees with `reps.length x set_repeat`, so the library
  can't drift again. [CLEAR]

## MAY

- A1. A "planned vs completed" readout (count of logged reps against the planned
  count) in the log or a future stats view, now that the denominator is
  unambiguous. The motivating use case, but separable. [CLEAR]

## Out of scope

- Capacity/rollup analytics beyond the count itself.
- The other 2026-06-28 data-quality observations (empty "take 2" plan, thin
  contraction capture, inconsistent actual recovery) -- noted separately.

## Acceptance

- Building a CO2/O2 table from the library yields the right number of log slots
  with no manual "Sets" retyping, and the overview / estimate / log all agree on
  the count.
- No exercise can be saved with a count in one field that contradicts another.
- `python schema/validate.py` and `npm run build` pass.

## Open question for Emilia

Which model -- C (listed reps, recommended), B (fold into set_repeat), or A
(termination as source)? The recommendation is C: it is the most honest about what
a CO2/O2 table is, matches the existing vocabulary note, and needs the least change
to the app's count logic (mostly a library regeneration). Confirm and I will write
the implementation plan.
