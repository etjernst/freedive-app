# Per-exercise insight metrics: review draft

One row per canonical exercise, proposing the headline metric for its history card, the figure type, and the direction that counts as progress.
Mark up directly: change a metric, strike a row, or add a note; nothing here is wired into the app until you approve it.
Drafted 2026-07-06 from the catalog in `seed/build_library.py`; the V-shaped CO2 table row is already shipped and is included for completeness.

Figure vocabulary, to keep the table short:
- rep dots: the shipped dot plot (x = rep, y = value, one color per session).
- rep bars: grouped bars, x = rep, height = value, one color per session, so an added rep shows as a new bar and a longer hold as a taller one.
- session dots: the headline metric over time, one dot per session, no connecting line.
- none: no standalone card; the exercise still counts toward weekly volume and the warm-up comparison.

Conventions proposed:
- Warm-ups and cool-downs get no standalone card; warm-ups show up in the max-by-warm-up comparison instead.
- Configs annotate, they do not gate: absolute realized quantities (time under hold, meters, reps at a given hold) compare across intensity settings, because a relative setting like %PB tracks a moving baseline and would hide real progress; the card shows the setting as context.
A comparison is gated only where the config changes what the metric counts rather than how hard it was (sweet-16's 16 laps, per-rep lung volume).
- Direction matters: the registry records whether up or down is better, so cards can honestly say improved or declined (stroke counts and recovery ladders improve downward).
- Every metric needs the underlying field actually logged; rows flagged "data gap" need either a logging habit or a small capture change first.

## STA mains

| id | exercise | headline metric | figure | better | notes / edge cases |
|---|---|---|---|---|---|
| sta-nwu-submax | NWU sub-max or max | hold time | session dots | up | Sub-max by design, so this trends readiness, not capacity; show RPE beside it. |
| sta-nwu-submax-moving | NWU sub-max or max (moving) | hold time | session dots | up | Same caveat; separate history from the still variant is the point of the split. |
| sta-co2-increasing | CO2 increasing | last completed hold | rep dots | up | Until-failure: last completed hold = how far the ladder got. Total time under hold as secondary line. |
| sta-co2-vshape | CO2 V-shape | total time under hold | rep dots | up | Shipped. Interrupted tables still count (the total is the point, unlike sweet-16). |
| sta-co2-1breath | CO2 1RB wonka | reps completed | rep dots | up | Quality-drop termination makes reps the ladder length; total time secondary. Always run 1C+X, so no mode gate. |
| sta-co2-short-intense | CO2 2RB repeats | total time under hold | rep dots | up | A brutal table where completing the intended reps is not a given, so total time is a real progress signal, not just showing up. Rep dots show each hold. |
| sta-co2-decreasing-rec | CO2 classic | total time under hold | rep dots | up | Reps are meant to be fixed as recovery shrinks, so total time under hold reads cleaner than a rep count and matches the sibling tables. Smallest recovery reached as secondary. |
| sta-co2-square | Box breathing | total duration | session dots | up | Continuous protocol, one number per session. Box length shown as context (it sets intensity, not what the metric counts). |
| sta-co2-second-hold | CO2 two-hold | second hold time | session dots | up | The first hold is setup; only the second hold is the target. First-hold %PB shown as context. |
| sta-get-high | Get high (oxygen table) | longest hold | rep dots | up | Ladder shape shows nicely as rep dots. |
| sta-el | EL reps | longest EL hold | rep dots | up | Relaxed-belly vs pull-and-release shown as context; the hold time compares either way. |
| sta-el-fl-switch | EL/FL switch | longest EL hold and longest FL hold | rep dots | up | Two headline numbers; the dot plot needs per-rep lung volume to split the two ladders visually. |
| sta-1c-plus | First contraction plus | longest hold | rep dots | up | The deeper signal is the 1C times themselves, which feed the first-contraction trend, not this card. |
| sta-frc-awareness | FL → FRC | total time under hold | rep dots | up | Short holds; total is the honest summary. |
| sta-high-volume | High-volume 70-80% PB | total time under hold | rep bars | up | Two improvement margins in one figure: taller bars (longer holds) and more bars (added reps), with the total above the chart. %PB shown as context only, per Emilia: it measures intensity against a moving baseline, while reps x hold time is the progress measure. |
| sta-progressive-fl | Progressive FL | final hold of the sequence | rep dots | up | The last hold is the day's max-ish; the dots show the ramp. |
| sta-max | STA max attempt | hold time | session dots | up | Feeds the progression chart and the PB auto-update; wet vs dry split already exists. |
| sta-cooldown-easy | Easy cool-down STA | none | none | n/a | Deliberately easy; tracking it would reward the wrong thing. |

## STA warm-ups

| id | exercise | headline metric | figure | better | notes / edge cases |
|---|---|---|---|---|---|
| sta-wu-fl-progression | WU: FL progression | none | none | n/a | Enters the max-by-warm-up comparison. |
| sta-wu-frc-progression | WU: FRC progression | none | none | n/a | Same. |
| sta-wu-contraction-delay | WU: contraction delay | none | none | n/a | Same; its 1C times feed the first-contraction trend. |
| sta-wu-rv-fl | WU: RV progression + 1 FL | none | none | n/a | Same. |
| sta-wu-nwu-hard-start | WU: NWU hard start | none | none | n/a | Same. |
| sta-wu-3rv-3fl | WU: 3xRV + 3xFL | none | none | n/a | Same. |

## Dynamic

| id | exercise | headline metric | figure | better | notes / edge cases |
|---|---|---|---|---|---|
| dyn-nwu-submax | NWU sub-max (dynamic) | distance | session dots | up | Readiness read, same caveat as the STA twin. |
| dyn-max | Dynamic max attempt | distance | session dots | up | Per discipline and lung volume; feeds progression and PB auto-update. |
| dyn-max-simulator | Max dive simulator | max-push distance | session dots | up | The final push is the target; total distance secondary. |
| dyn-volume-fixed | Volume: fixed reps | total distance | session dots | up | Fixed structure, so completion + RPE carry most signal; rep distance shown as context, total meters compare across it. |
| dyn-volume-maximize | Volume: maximize total distance | total distance | rep dots | up | The goal is literally this number; rep dots show how it was assembled. |
| dyn-volume-technique | Volume: technique drill | total distance | session dots | up | Stroke counts would be richer but are a data gap (see dyn-technique). |
| dyn-pyramid | Pyramid drills | pyramids completed | session dots | up | Structure is fixed per pyramid; count completed sets. Distances differ for DNF = different config. |
| dyn-inverse-pyramid | Inverse pyramid | sets completed | session dots | up | Same logic as the pyramid. |
| dyn-descending | Descending distance | first (longest) distance | rep dots | up | The opener is the day's long doable; the -20% steps are structure. |
| dyn-sweet16 | Sweet 16 | total time | session dots | down | Only full 16-lap sets count; interrupted sets are excluded, per your call. |
| dyn-sprints | Sprint set | average lap time | session dots | down | Needs aggregate logging (total time + laps) to compute; per-rep logs without times are a data gap. |
| dyn-frc-sprint | FRC dive + sprints | FRC dive distance | session dots | up | The sprint ladder is conditioning; the FRC dive is the measured part. |
| dyn-elastic-sprint-max | Elastic sprints into max | max dive distance | session dots | up | Sprints are setup. |
| dyn-stop-start | Stop-start (STA then swim) | swim distance | session dots | up | Comparable only when the preceding hold duration matches; card should show the hold as context. |
| dyn-start-stop | Start-stop (swim then STA) | hold time after the swim | session dots | up | Mirror case: comparable only at the same swim distance. |
| dyn-stop-dyn | Stop in the middle (dive-STA-dive) | total distance (both legs) | session dots | up | STA duration shown as context; leg-2 distance is the tiebreaker if totals equal. |
| dyn-transition-ladder | STA-to-dynamic transition ladder | longest dynamic reached | rep dots | up | Mode (FL/crawl/FRC) is the config. |
| dyn-technique | Technique drills | strokes per length | session dots | down | Data gap: stroke counts currently live in remarks at best; needs a capture field before this card exists. |
| dyn-tortuga | Tortuga (slow crawl) | time | session dots | up | Its own discipline; feeds the tortuga PB. |
| dyn-broken-200 | Broken 200m | none for now | none | n/a | The honest metric is total elapsed time including recoveries, which is not captured; data gap, revisit with aggregate-style logging. |
| dyn-hypercapnic | Hypercapnic cool-down | none | none | n/a | Cool-down; its meters still count toward weekly volume. |
