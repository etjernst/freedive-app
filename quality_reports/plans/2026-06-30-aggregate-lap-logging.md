# Plan: aggregate lap-set logging (sweet-16)

Implements spec [2026-06-30-aggregate-lap-logging.md](file:///C:/git/freedive-app/quality_reports/specs/2026-06-30-aggregate-lap-logging.md).
Confirmed: library-only log_mode (no builder toggle yet); show pace per lap AND
normalized per 25 m; pace = total_time / n_reps.

## 1. schema/freedive.schema.json
Add `"log_mode": { "enum": ["per_rep", "aggregate"] }` to `exerciseTemplate`
properties (optional; default handled in app). Fixtures then validate.

## 2. seed/build_library.py
Add `LOG_MODE = {"dyn-sweet16": "aggregate"}`; emit
`"log_mode": LOG_MODE.get(cid, "per_rep")` on every template. Regenerate;
`schema/validate.py` passes.

## 3. src/lib/session.js
- `instantiateExercise` / `blankExercise`: carry `log_mode` (default `per_rep`);
  `exerciseToTemplate` passes it through.
- `blankAggregate(ex)`: `{ lap_distance_m: first planned rep distance (else 25),
  total_time_s: null, n_reps: plannedRepCount(ex) }`.
- `seedActual`: when `ex.log_mode === 'aggregate'`, return
  `{ physical_rpe, mental_rpe, deviation_reason, remarks, aggregate: blankAggregate(ex) }`
  (no `reps`); otherwise unchanged.
- `aggregatePace(agg)`: returns `{ perLap, per25, totalDist }` (null when inputs
  missing); `perLap = total_time_s / n_reps`, `per25 = perLap * 25 /
  lap_distance_m`, `totalDist = lap_distance_m * n_reps`. Derived, never stored.

## 4. src/SessionLog.svelte
- Load loop: guard the lung/pace backfill with `if (ex.actual.reps)`; if
  `log_mode === 'aggregate'` and no `ex.actual.aggregate`, seed it.
- Exercise card: hide the exercise-level lung/speed controls when aggregate (they
  write to `actual.reps`, which an aggregate has none of).
- Replace the per-rep `reps` block with an aggregate summary when
  `log_mode === 'aggregate'`: lap distance (25/50 select), total time (MMSS),
  rep count (number, default 16), and a read-only derived line (pace/lap, pace/25 m,
  total distance) via `aggregatePace`.
- Keep exercise-level RPE / deviation / remarks unchanged.

## 5. Out of scope
Builder toggle (library-only first cut); overview line stays as
"x16 sets / 25 m sprint" (already reads as a set); other exercises untouched.

## Verification
1. `python seed/build_library.py`; `python schema/validate.py` passes.
2. `npm run build` succeeds.
3. Unit-check (Node or in-page): `seedActual` for sweet-16 yields an `aggregate`
   with `n_reps 16`, `lap_distance_m 25`, no `reps`; `aggregatePace` for
   `{lap 25, total 240, n 16}` gives perLap 15 s, per25 15 s, total 400 m; for
   `n 11` recomputes perLap.
4. Per-rep exercises still render and save unchanged.
5. Commit; push on Emilia's say-so.
