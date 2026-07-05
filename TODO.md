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

## Progress tracking and calendar

Phase 3 direction, to be scoped: trend views over the logged history (PBs over time, the VC series from the measurements store, volume per week per discipline) and a calendar view of past and planned sessions.
The `%PB` estimators still resolve dynamic targets against the FL max only; deciding whether FRC/EL reps should use the new lung-specific PB keys belongs to this scoping.

## Smaller deferred items

- The qualitative ratios in `estimate.js` (submax 75 percent, recovery multipliers, and so on) are hardcoded constants; surface them in Settings if they ever need tuning in-app.
- Library templates seed with a single placeholder rep; some exercises could carry fuller default rep ladders so a freshly added exercise estimates without first building out its reps.
