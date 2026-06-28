# Winnow backlog

## Auto-update personal bests from a logged "New PB"

When logging, a rep can be checked as "New PB", but that flag does not yet update the stored PB in Settings.
Wire it so that saving a logged session with a "New PB" rep offers to update (or auto-updates) the matching PB in `settings.pbs`.

Mapping from the rep to the PB key:
- STA full-lung hold to `STA`, STA empty-lung (RV) hold to `STA_EL`.
- DNF / DYN / DYNb max distance to `DNF` / `DYN` / `DYNb`.
- Tortuga time to `tortuga`; the sweet-16 sprint time to the `sweet16_*` key for its discipline.

Only raise the PB (never lower it from a non-PB rep), and confirm before overwriting so a mistaken check does not clobber a real best.

## Log lung volumes (vital capacity, with and without packing) as measurements

Vital capacity lives in Settings as a single spirometer value, but Emilia wants to log it the way she logs exercises: a dated reading she can repeat and trend over time.
Each entry should carry the date, vital capacity in liters, an optional packed vital capacity in liters (after glossopharyngeal insufflation), and optional notes.
Store these as a time series rather than overwriting one setting, surface entry in the capture flow (a dedicated quick-log alongside exercises is fine), and feed the series into the Phase 3 lung-volume trend.

## Smaller deferred items

- The qualitative ratios in `estimate.js` (submax 75 percent, recovery multipliers, and so on) are hardcoded constants; surface them in Settings if they ever need tuning in-app.
- Library templates seed with a single placeholder rep; some exercises could carry fuller default rep ladders so a freshly added exercise estimates without first building out its reps.
