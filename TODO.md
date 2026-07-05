# Winnow backlog

## Auto-update personal bests from a logged "New PB"

When logging, a rep can be checked as "New PB", but that flag does not yet update the stored PB in Settings.
Wire it so that saving a logged session with a "New PB" rep offers to update (or auto-updates) the matching PB in `settings.pbs`.

Mapping from the rep to the PB key (the PB list expanded to 18 keys on 2026-07-05):
- STA holds by lung volume: FL to `STA`, FRC to `STA_FRC`, RV/EL to `STA_EL`; a no-warm-up max to `STA_NWU`; a with-movement max to `STA_MOVE` (needs a way to tell those variants apart from the exercise, e.g. template id).
- DNF / DYN / DYNb max distance by lung volume: FL to the bare key, FRC to `*_FRC`, RV/EL to `*_EL`.
- Tortuga time to `tortuga`; the sweet-16 sprint time to the `sweet16_*` key for its discipline.

Only raise the PB (never lower it from a non-PB rep), and confirm before overwriting so a mistaken check does not clobber a real best.

## Stretching sessions (quick-log)

A lightweight quick-log beside the freedive session flow, not a full builder session: pick a stretching type (about three types, exact list TBD with Emilia), enter total time, optional notes, dated.
Store as its own series (the measurements-store pattern from the VC log fits) so frequency and time can be trended.

## Insights expansion (design settled 2026-07-06, build in slices)

The V-shaped CO2 table history card shipped as the per-exercise prototype: total time under hold as the headline metric, per-rep dot plot, series colors validated for CVD and contrast.
Agreed design, in Emilia's words where it matters:

- Per-exercise metrics: each exercise needs its own metric and (optional) figure; next step is a pass over all 45 templates assigning one, for Emilia to review. Sweet-16 metric is total time, and interrupted sets (fewer than 16 laps) simply do not count.
- Progression: best hold / best distance per session over time; noisy on sessions without a max or sub-max attempt, and that is accepted.
- Volume: minutes held (wet + dry combined) and meters swum, one dot per week, no connecting line.
- Calendar: dots per day, colored by type (STA dry, STA wet, pool, stretching), not shading.
- Wet vs dry STA: one bar graph, max and sub-max pooled, FL by default with a toggle for FRC / RV.
- Deviation-reason breakdown, including sessions planned but never logged (a motivation number, so it must be visible, not buried).
- Feelings alongside maxes: RPE now; sentiment on session remarks is a maybe-later.
- Standard errors on comparisons once n is large enough; until then every card shows its n and degrades to a plain list.
- Data-gap surfacing: the tab should say where more observations are needed (the warm-up-before-max comparison is the known example), because seeing the gap is itself motivating.

## Progress tracking and calendar

Phase 3 direction, absorbed largely into the insights expansion above; what remains distinct is planned-session scheduling on the calendar.
The `%PB` estimators still resolve dynamic targets against the FL max only; deciding whether FRC/EL reps should use the new lung-specific PB keys belongs to this scoping.

## Smaller deferred items

- The qualitative ratios in `estimate.js` (submax 75 percent, recovery multipliers, and so on) are hardcoded constants; surface them in Settings if they ever need tuning in-app.
- Library templates seed with a single placeholder rep; some exercises could carry fuller default rep ladders so a freshly added exercise estimates without first building out its reps.
