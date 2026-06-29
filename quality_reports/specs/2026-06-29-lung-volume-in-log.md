# Spec: lung volume (and pace) capture in the log view

## Why

Today, lung volume and pace live only on *planned* reps and are editable only in
the builder. The log view can neither show a control nor store a realized value.
Two real cases break:

1. Realized differs from plan: planned an FRC hold, actually did it full lung.
   There is nowhere to record the realized lung volume.
2. An exercise added in the log (an ad-hoc warm-up that was never planned) has no
   lung-volume control at all, so FRC can only go in the title -- the exact
   problem Emilia hit with the 2026-06-28 warm-ups.

The fix: let the log view capture realized lung volume (and pace), stored on the
actual rep, distinct from the planned value so the plan-vs-actual gap is
preserved.

## Model decision (the crux)

Realized lung volume must live on the ACTUAL rep, not by rewriting the plan. The
plan stays frozen; `actual.reps[*]` gains `lung_volume` (and `pace`). Recording a
realized value never mutates `planned.reps`. This keeps the plan-vs-actual gap,
which is the whole point of the two-snapshot model.

## MUST

- M1. Add `lung_volume` to the actual-rep shape (`blankActualRep`) and to the
  session schema as an optional field, same code set as planned
  (FL / FRC / RV-as-EL). Additive and optional: existing logged sessions with no
  value stay valid. [CLEAR]
- M2. The log view exposes a lung-volume control that writes the realized value
  onto the actual rep(s). At minimum an exercise-level control (writes all actual
  reps), mirroring the builder's exercise-level control. [CLEAR]
- M3. When an actual is seeded from a plan (`seedActual`), each actual rep's
  `lung_volume` is initialized from its planned rep's `lung_volume` (so a planned
  FRC exercise shows FRC in the log, editable to record a deviation). [CLEAR]
- M4. Exercises added in the log (ad-hoc via `blankExercise`, or from a template)
  get the same lung-volume control and a sensible default (FL when there is no
  plan to inherit from). [CLEAR]
- M5. No estimation or save-shape regression beyond the additive field; the
  planned snapshot is never mutated when a realized lung volume is set. [CLEAR]

## SHOULD

- S1. Capture realized `pace` on the actual rep too (parallel to lung volume;
  dynamic disciplines), with the same seeding-from-plan and log control. [CLEAR]
- S2. Per-rep override in the log (under the existing "More" details), for the
  exception where one rep in a set differs, mirroring the builder. [CLEAR]
- S3. When realized lung volume differs from the planned value, surface it
  (e.g. show "plan FRC -> did FL") so the deviation is visible, not silent.
  [NEEDS CONFIRMATION: worth the UI, or just store it quietly for now?]

## MAY

- A1. The plan overview (just shipped) and the Obsidian export could show realized
  vs planned lung volume once realized values exist. Deferred. [CLEAR]

## Out of scope / tracked separately

- The `set_repeat` vs `termination.n` planned-rep-count ambiguity (a CO2 table's
  "6 holds" lives in `termination.n` but the slot scaffold uses `set_repeat`).
  Real issue for completion-rate analysis, but a separate fix from lung volume.
- Backfilling lung volume onto the already-logged 2026-06-28 session: Emilia can
  set it via Edit plan today; no migration needed.

## Acceptance

- In the log view, lung volume (and pace, per S1) can be set and persists on the
  actual rep; re-opening the session shows the saved realized value.
- An exercise added directly in the log can have its lung volume marked without
  any Edit-plan detour.
- Setting a realized lung volume does not change `planned.reps`.
- `python schema/validate.py` passes; `npm run build` succeeds; no console errors.
