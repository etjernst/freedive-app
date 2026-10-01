# Spec: set-level targets and recovery in the builder (2026-10-01)

Scope: the session builder in `freedive-app`, both editions.

## Problem

Emilia's example: 8 reps of 25 m with a 3-breath recovery.
The Reps field at the top sets the count, but each rep keeps its own distance and recovery, so she edits all 8: the distance, the recovery type, the unit, and the value.
The library's "Technique drills" template (`dyn-technique`) also seeds 12 reps with a qualitative "adequate" recovery, which the same edits have to replace.

## MUST

- M1 An exercise-level "Distance" field (unit plus value, the rep editor's unit choices) on any exercise with more than one rep whose reps capture a distance; it shows the first such rep's target and writes the same target to every rep with a distance segment.
- M2 An exercise-level "Hold" field with the same behavior for reps that capture a hold (STA, and the hold segment of stop-start shapes).
- M3 An exercise-level "Recovery" field (type, value, unit, the rep editor's choices) that shows the first rep's recovery and writes it to every rep.
- M4 A "decrease per rep" amount beside a fixed or capped recovery: rep i gets start − i × decrease, floored at zero, in the recovery's own unit (time or breaths), as in a CO2 table; the amount is stored on the exercise (`recovery_decrement`) and the progression is recomputed when the start, the amount, or the rep count changes.
- M5 No "mixed" state; the per-rep editors stay editable for one-off changes.
- M6 The stored rep shape does not change, so the log, the estimator, the plan overview, and the Obsidian export read the reps as before.

## Decided against

A "mixed" display when reps differ (Emilia: the per-rep fields cover the exceptions).
Auto-folding the per-rep rows when reps agree (she collapses finished exercises herself).

## Out of scope

Library template changes, the log screen, rest between sets, and a per-rep hold increment (an O2 table).
