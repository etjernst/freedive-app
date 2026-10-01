# Plan: set-level targets and recovery in the builder (2026-10-01)

Spec: [2026-10-01-set-level-rep-targets.md](../specs/2026-10-01-set-level-rep-targets.md).

## Approach

Write-through, the pattern the lung-volume, speed, and technique selects already use: the exercise-level field reads the first rep and writes every rep.
An inherited set-level target on the exercise was rejected, since the estimator, the log's seeding, the plan overview, and the Obsidian export all read targets per rep and would each need a fallback.

## Steps

1. In `src/SessionBuild.svelte`, add helpers that find the reps with a given segment, read the first one's target or recovery, and write a target or recovery to all of them; a unit or type change resets the value.
2. Add `applyRecoveryStep(ex)`, which rewrites the recoveries as start − i × `recovery_decrement` when the amount is set and the type is fixed or cap; call it after the start or amount changes, after `setRepCount`, and after "+ Add rep"; backfill `recovery_decrement` to null in `ensureExercise`.
3. Render Distance, Hold, and Recovery fields below "Reps" when the exercise has more than one rep, with function bindings so MMSS writes through; show "decrease per rep" for fixed and cap recoveries.
4. Verify in a browser on `vite preview`: technique drill, Reps 8, Distance 25 m, Recovery fixed 3 breaths, then every rep row, the collapsed summary, and the estimate; a CO2 table with recovery 2:00 decreasing 0:15; a locked plan disables the new fields; `npm run build` and `npm run build:seals` succeed.
5. Commit; push only when Emilia says so.
