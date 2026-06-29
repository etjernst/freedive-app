# Spec: aggregate "lap set" logging (sweet-16 and similar)

## Why

Most exercises want per-rep logging (each dive/hold tracked). Sweet-16 is
different: it is 16 identical short sprints, and logging 16 rows is tedious and
pointless. Emilia wants to log it as a summary instead: one lap distance (25 or
50 m), one total time, and a rep count (default 16, editable for an early stop),
with pace derived. The same shape suits any "many identical laps" set.

## Model

Add `log_mode` to the exercise: `'per_rep'` (default) | `'aggregate'`. Carried on
the template and the session instance. When `aggregate`, the actual stores a
summary instead of a `reps` array:

`actual.aggregate = { lap_distance_m, total_time_s, n_reps }`

Derived (never stored): pace per lap = `total_time_s / n_reps`; total distance =
`lap_distance_m * n_reps`. Keeping only the three inputs and deriving the rest
follows the no-stored-derived rule and lets an early stop (fewer reps) recompute
pace correctly -- exactly Emilia's "in case I don't have time to finish" case.

Seed defaults when an aggregate actual is created: `n_reps` from
`plannedRepCount(ex)` (16 for sweet-16), `lap_distance_m` from the first planned
rep's `distance_target.value` (25).

## MUST

- M1. `log_mode` added to the seed template schema (optional enum, default
  `per_rep`) so fixtures validate; `build_library.py` sets `dyn-sweet16` to
  `aggregate`; regenerate, `schema/validate.py` passes. [CLEAR]
- M2. `instantiateExercise` / `blankExercise` carry `log_mode` (default
  `per_rep`); `seedActual` produces an `aggregate` summary (not a `reps` array)
  when `log_mode === 'aggregate'`. [CLEAR]
- M3. The log view, for an aggregate exercise, renders a compact summary block --
  lap distance (editable, 25/50), total time (mm:ss), rep count (editable, default
  16) -- instead of the per-rep list, and shows derived pace per lap and total
  distance read-only. [CLEAR]
- M4. Exercise-level RPE, deviation, and remarks stay (only the per-rep list is
  replaced). Save persists `actual.aggregate`; re-open restores it. [CLEAR]
- M5. No regression for per-rep exercises; the saved-session shape is additive
  (`log_mode`, `actual.aggregate`). [CLEAR]

## SHOULD

- S1. A builder toggle to switch an exercise between per-rep and aggregate, so
  Emilia can mark other sprint sets aggregate without a library change. [NEEDS
  CONFIRMATION: include now, or library-only (sweet-16) for the first cut?]
- S2. Also show a normalized pace per 25 m when `lap_distance_m` is 50, so two
  sweet-16 sessions at different lap lengths stay comparable. [NEEDS
  CONFIRMATION.]
- S3. The plan overview line for an aggregate exercise reads as a set
  (e.g. "16 x 25 m sprint") rather than listing one rep x16. [CLEAR]

## MAY

- A1. Carry an incident field on the aggregate block (a samba/LMC during a sprint
  set). Deferred unless wanted. [CLEAR]

## Out of scope

- Changing per-rep logging for any other exercise.
- The planned-rep-count work (already done): aggregate `n_reps` defaults from it
  but does not change it.

## Acceptance

- Opening sweet-16 in the log shows lap distance / total time / rep count, not 16
  rows; entering total time and a rep count yields a correct derived pace; an
  early stop (e.g. 11 reps) recomputes pace.
- `schema/validate.py` and `npm run build` pass; per-rep exercises unchanged.

## Open questions for Emilia

1. S1: build the per-rep/aggregate toggle into the builder now, or keep aggregate
   library-only (just sweet-16) for the first cut?
2. S2: show a normalized pace per 25 m alongside pace per lap?
3. Pace unit: confirm "pace per lap = total time / rep count" (seconds per lap) is
   what you want displayed.
