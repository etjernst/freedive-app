# Vocabulary, enums, and the first-contraction formula (Phase 0a)

This file pins the controlled vocabularies and the one formula the schema references.
The JSON Schema is the machine-checkable contract; this file is the human reference and records two decisions for Emilia to confirm.

## Capacity tags

The controlled set, multi-valued per exercise, sourced from each exercise's goal:

- `co2` -- CO2 tolerance.
- `o2_hypoxia` -- O2 / hypoxic efficiency (includes EL/RV work).
- `mental` -- relaxation and nervous-system calm.
- `volume` -- training volume / time under tension.
- `lung_volume` -- spirometer vital capacity and packed volume.
- `fitness_lactic` -- fitness and lactic tolerance. Dynamic and gym only.
- `technique` -- stroke efficiency and form. Dynamic and gym only.

## Enums

- discipline: STA, DYN (monofin), DYNb (bifins), DNF (no-fins), and `any` (templates only; a planned exercise always has a concrete discipline).
- lung volume: FL, FRC, RV (RV = EL).
- role: warmup, main, cooldown.
- environment: pool, dry, gym.
- pace: sprint, max_sprint, relaxed, race_pace.
- technique variant (DNF only): legs_only, arms_only, normal, crawl.
- hold target unit: absolute (s), pct_pb (%), contraction_relative (1C + X s; 0 = until 1C), qualitative (first_discomfort / submax / strong_submax / max / close_to_max).
- distance target unit: absolute (m), pct_pb (%), qualitative, computed (e.g. min_of, pct_less_than_previous).
- recovery target type: absolute, cap, inequality, qualitative (minimal / adequate / full); unit time or breaths.
- termination: fixed_n, range, until_1c, until_utb, until_failure, until_quality_drops, duration_capped.

## First-contraction rolling average

Used to resolve `contraction_relative` holds (1C + X) for the time estimate, and tracked as a CO2-tolerance metric.

- Keyed by discipline x lung volume (RV/EL contractions arrive far earlier than full-lung, so buckets are separate).
- The unit follows the discipline: seconds for static, meters for dynamic, since contractions are timed in STA but measured by distance in DYN/DNF.
- Window: the last N logged first-contraction values in that bucket. Start with N = 5 and a simple mean (no decay); revisit if it lags real change.
- Minimum N before the average is trusted: 3. Below that, fall back in this order: the user's hand-entered baseline for the bucket, then the template nominal.
- The estimate surfaces which source it used (rolling average / baseline / nominal).

## Two decisions surfaced for Emilia

1. Discipline and shape are stored as separate fields, not one combined "format" dropdown. `discipline` is STA/DYN/DYNb/DNF; `shape` is simple / stop-start / start-stop / stop-in-the-middle / continuous-protocol. The UI can still present them as one picker, but storing them apart avoids double-encoding (a "format = STA" that contradicts a separate discipline). The contraction unit derives from discipline (STA -> seconds, dynamic -> meters). Confirm this split is fine.
2. "Increasing" sets with no explicit numbers (e.g. EL 5x increasing) are modeled as a single rep plus `termination: fixed_n` and a note, rather than five hand-numbered reps. Explicitly numbered ladders (the CO2 and O2 tables) list their reps. Confirm this convention.
