# Spec: planner and log fixes (2026-08-17)

Scope: the full Winnow edition (`freedive-app`), seven items from Emilia's list of 17 August 2026.
The Seals edition shares the source, so every change below must leave `npm run build:seals` working and its template student intact.

## Diagnosis first: why reps end up unestimated

Run against her 14 August Dropbox backup with the app's own `estimateExercise`, three causes account for every unestimated rep:

1. Sprint pace is unset (`sprint_pace_s_per_25` is null for DNF, DYN, DYNb) while cruise pace is set (35/25/25 s per 25 m), so every rep marked `sprint` cannot be timed: the Sweet 16 (16 reps), the DYN sprint sets on 10 and 13 August (2 and 6 reps).
2. A qualitative distance target ("max") is not converted to meters; the estimator only reads a planning distance she never filled in: both Max dive simulators on 29 June (1 rep each).
3. Blank targets: a hold with no value (23 January, 28 June).

Item 3 is correct behavior; items 1 and 2 are what the changes below fix.

## MUST

- M1 Log screen visually distinct from the builder: its own accent color on the header band, cards, and sticky footer, plus a persistent "Logging actuals" label; the builder keeps the current look.
- M2 Plan lock: a `plan_locked` flag on the session, set from a "Lock plan" button in the builder (and offered again on the way to "Log actuals"). A locked session opens in the log view from the sessions list; the builder renders read-only behind a banner with an "Unlock plan" button; the log's "Edit plan" link still works but lands on that read-only builder.
- M3 Template student out of the full edition: the Settings section and the "Estimate for" toggle appear only under `IS_SEALS`; the full edition always estimates for the user's own profile.
- M4 The per-discipline sprint pace in Settings is the full-sprint pace: `max_sprint` reps swim at it, `sprint` reps at the midpoint between it and the cruise pace, and either falls back to the cruise pace when no sprint pace is set (an overestimate, still a number); Settings labels the field "Full sprint pace".
- M5 Qualitative distance targets that name one of the five words (first discomfort, submax, strong submax, close to max, max) time as `QUAL_PCT` × PB, like holds already do; free text still falls back to the planning distance.
- M6 New percentages: submax 70%, strong submax 80%, close to max 85%, max 90% (first discomfort stays 50%). Jeranko's submax ramps 65% (weeks 6–8), 70–80% (weeks 9–16), 80–90% with packing (weeks 17–24), 80% in competition week, so one word cannot be exact; 70% is the middle of that range and an exact target belongs in the `% PB` unit. Max attempts estimate at 90% per Emilia.
- M7 Max-attempt overhead: a rep whose hold or distance target is qualitative `max` or `close_to_max` adds preparation and recovery time to the estimate, 5 min each by default, editable in Settings; the builder's estimate line and the log's plan overview say when it applies.
- M8 Rest between sets and exercises: `recovery_inter` (rest between sets) becomes editable in the builder when sets > 1 and enters the estimate as (sets − 1) × rest; a "+ rest" control between exercise cards stores `rest_after_s` on the preceding exercise, shows as a pill, enters the estimate, and appears in the plan overview.
- M9 Collapsible exercise cards in the builder: a per-exercise `collapsed` flag (persisted with the plan) shows the card as a summary (name, discipline, sets, plan lines, estimate) with expand/move/remove controls; new exercises start expanded.
- M10 DNF technique: a `technique` field per rep (`arms_only`, `legs_only`, absent = full stroke) with an exercise-level select for DNF exercises in the builder, per-rep override under "More options", shown in the log's planned context and settable on actual reps.
- M11 Log "+ Add rep" copies the realized values of the rep above (hold, distance, duration, recovery, lung, pace, technique, prep); it never copies PB flag, incident, HR, SpO₂, contraction, or notes.

## SHOULD

- S1 Schema: `technique` on rep objects, `rest_after_s`, `plan_locked`, `collapsed` documented where the session shape is described; `python schema/validate.py` still passes.
- S2 The plan overview in the log and the Obsidian export both show rest-between-sets, rest-after, and technique, through the shared `planRepLine` / `planOverview` helpers.

## MAY

- Y1 "Collapse all / expand all" in the builder.
- Y2 The 5-minute overhead extends to `pct_pb` targets at 85% or above.

## Out of scope

Seals catalog changes, the Swedish qualifier gap analysis, sync/merge work.
