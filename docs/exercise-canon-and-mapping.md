# Canonical exercises and library mapping

Built from the two Obsidian library notes (`STA Exercise library freediving.md`, `DYN exercise library freediving.md`).
The `seed/fixtures.json` templates are ignored; this is the rebuild from the real library.

Status: draft for Emilia to review. Two parts: (A) the canonical exercise catalog, deduplicated from the sessions; (B) the mapping of every session-exercise onto a canonical id.

## Part A: canonical exercise catalog

Each canonical entry is a distinct training primitive that one or more sessions instantiate with different parameters. Discipline column: STA, or DYN family (DYN/DYNb/DNF, often "any").

### Static (STA)

| id | name | capacity focus | defining structure |
|----|------|----------------|--------------------|
| sta-nwu-submax | NWU sub-max | mental, co2, o2 | No warmup, HV prep, one sub-max hold to read sensations. Variant: with movement. |
| sta-co2-increasing | CO2 table, increasing holds | co2 | Fixed recovery breaths (often 5xRB), holds increase by 20-30s from a start, until failure. |
| sta-co2-vshape | CO2 table, V-shaped | co2 | 2xRB, holds descend toward 1-min then ascend; maximize total time under discomfort. |
| sta-co2-1breath | 1-breath CO2 ladder | co2 | 1-breath recovery, short repeated holds; ladder by absolute time or by 1C+Xs, until quality drops. |
| sta-co2-short-intense | Short & intense CO2 | co2 | 5-6 FL holds at a sustainable duration, 2-breath recovery only. FRC warm-up first. |
| sta-co2-decreasing-rec | Medium & moderate CO2 | co2, mental | Fixed hold (sized to expected contraction duration), recovery shrinks each rep (60s down to 10s). |
| sta-co2-square | Soft & medium CO2 (square breathing) | mental, co2 | Square breathing (e.g. 10s box) held for ~30 minutes. |
| sta-co2-second-hold | CO2, challenging second hold | co2 | Sub-max (~70% PB), 3 recovery breaths, then max-effort second hold as the target. |
| sta-o2-table | Oxygen / hypoxic table | o2_hypoxia | Strong HV prep before each, FL holds increase (often +30s to +1min), longer recovery (2 min). |
| sta-el | Empty-lung set | o2_hypoxia, mental | RV/EL holds, increasing duration, 2-3 min recovery. Variants: relaxed belly vs pull-and-release; 5x or 6x. |
| sta-el-fl-switch | EL/FL switch | o2_hypoxia, mental | Alternating EL and FL holds, both increasing, 2 min HV recovery between. |
| sta-1c-plus | First-contraction-plus ladder | co2, mental | Increasing breathing prep, hold target = 1C + Xs across reps (parasympathetic focus). |
| sta-frc-awareness | FRC CO2 awareness | co2 | FL then exhale to FRC then short hold (15/30/45s), 1-min recovery only. |
| sta-high-volume | High-volume holds | volume, co2, o2_hypoxia | Repeat ~70% PB many times (3-10), long or unlimited rest; high-volume CO2 variant reduces prep breathing each rep. |
| sta-progressive-fl | Progressive FL to max | co2, mental | Warm-up, then comfortable then strong-sub-max then max(-ish) FL for the day. |
| sta-warmup | STA warm-up (experimental) | mixed | Role=warmup. Family: FL progression, FRC progression, contraction-delay, RV+FL, NWU hard start, 3xRV+3xFL, EL/FL alternating. |

### Dynamic (DYN / DYNb / DNF)

| id | name | capacity focus | defining structure |
|----|------|----------------|--------------------|
| dyn-nwu-submax | NWU sub-max (dynamic) | mental, o2 | Any discipline, ~70-80% feel, explore sensations, no fixed distance. Variant: to 1C + a few contractions. |
| dyn-max-simulator | Max dive simulator | o2_hypoxia | 80% PB, 2xRB, short dive, 3xRB, max push. Active safety. |
| dyn-volume | Volume set | volume, co2 | N x distance, set recovery, maximize total distance; recovery often shrinks across the session (4x/6x/8x ladders). |
| dyn-pyramid | DNF pyramid drills | co2, volume | 25-50-75-50-25 repeated for a duration (20 min) at sweet-spot effort. |
| dyn-inverse-pyramid | Inverse pyramid | co2, volume | 75-50-25-50-75, minimal but confident recovery; full recovery between sets. |
| dyn-descending | Descending distance | co2 | Long doable distance, then ~20% less, then ~20% less again; minimal recovery. |
| dyn-sweet16 | Sweet 16 | co2, technique | 16 x 25m as quickly as possible. |
| dyn-sprints | Sprint set | fitness_lactic, technique | Max sprints (25m/50m) with short recovery; frequently a component within other sessions. |
| dyn-frc-sprint | FRC dive + sprints | fitness_lactic | FRC dive (longest possible) then a max-sprint ladder with growing recovery. |
| dyn-elastic-sprint-max | Elastic sprints into max DNF | fitness_lactic | 4 x 15s elastic-band max sprints, 15s rest, immediately into a max DNF. |
| dyn-stop-start | Stop-start / start-stop | mental, co2 | STA hold then straight into a dynamic swim. Params: STA duration, then dynamic distance/sub-max. |
| dyn-transition-ladder | STA-to-dynamic transition ladder | mental, co2 | 2-3x STA to 1C/UTB then a dynamic (FL / crawl / FRC), swimming further each dive. |
| dyn-technique | Technique drills | technique | Legs-only / arms-only / normal, counting strokes to reduce them. |
| dyn-long-dives | Long dives, maximize distance | o2_hypoxia, volume | 3 x long dives, ~3 min recovery, maximize total distance. |
| dyn-slow-crawl | Slow walk/crawl | mental, co2 | Cover up to 50m in the longest possible time; distance irrelevant, max time. |
| dyn-broken-200 | Broken 200m DYNb | co2 | 75m, 50m, 3x25m with minimum recovery; consistent pace, drop into relaxation each swim. |
| dyn-hypercapnic | Hypercapnic cool-down | co2, volume | 300-500m continuous, breathing every 7+ strokes, no stopping. |

## Part B: session-to-canonical mapping

### STA sessions

| Source | Exercise | Canonical id | Variant / params |
|--------|----------|--------------|------------------|
| STA 1 | Ex1 NWU sub-max | sta-nwu-submax | 5 min strong HV (5:5), still, full recovery |
| STA 1 | Ex2 short CO2 table | sta-co2-increasing | start 2:00, +20-30s, 5xRB, until failure |
| STA 2 | Ex1 NWU with movement | sta-nwu-submax | soft HV (4:6), with movement variant |
| STA 2 | Ex2 long CO2 table V-shaped | sta-co2-vshape | 4 min soft HV, start ~50% PB, 2xRB |
| STA 3 | EL 2x5 | sta-el | 5x relaxed belly + 5x pull-and-release, 2-3 min recovery |
| STA 4 | first contraction-plus | sta-1c-plus | 2-4 min prep, 1C +0/20/40/60/80s; alt fixed 2-min recovery |
| STA 5 | CO2 awareness | sta-frc-awareness | FL to FRC, 15/30/45s, 1-min recovery |
| STA 6 | 1-breath table | sta-co2-1breath | 20-60s FL, 1xRB, moderate urge throughout |
| STA 7 | get high (O2 table) | sta-o2-table | 2:2 super-strong HV, +30s holds |
| STA 8 | high-volume | sta-high-volume | 1-3 FRC warm-up, 70% PB x3-10, unlimited rest |
| STA 9 | EL/FL switch | sta-el-fl-switch | 2 min 4:6 HV recovery, EL +20s / FL +20-30s |
| STA 10 | high-volume CO2 table | sta-high-volume | reduced-prep variant; 3 RV + 1 FL warm-up, 70% PB x3 |
| STA 11 | Ex1 6xEL | sta-el | 6 holds, 2-3 min 5:5 HV |
| STA 11 | Ex2 1xFL | sta-progressive-fl | 5 min 5:5 HV, 1 FL at 70-80% PB (single-hold case) |
| STA 12 | breathing-cycle 1C ladder | sta-1c-plus | breathing cycles 10/15/20/25/30, 1C +0/20/40/60 then submax/max |
| STA 13 | oxygen table | sta-o2-table | growing prep + holds +20-40s |
| STA 14 | oxygen table | sta-o2-table | 2 min recovery only, +1 min each, until failure |
| STA 15 | short & intense CO2 | sta-co2-short-intense | 2 FRC warm-up, 5-6 FL, 2-breath recovery (e.g. 6x2:30) |
| STA 16 | medium & moderate CO2 | sta-co2-decreasing-rec | hold sized to contraction duration, recovery 60s down to 10s |
| STA 17 | soft & medium CO2 | sta-co2-square | 10s square breathing, 30 min |
| STA 18 | hypoxia & CO2 | sta-o2-table | 2:2 HV, +30s each, target 90s-1min below PB |
| STA 19 | challenging second hold | sta-co2-second-hold | 70% PB, 3 RB, max second hold |
| STA 20 | Ex1 warm-up | sta-warmup | 3 FRC progressive + 2 FL 1C+30-60 |
| STA 20 | Ex2 progressive FL | sta-progressive-fl | comfortable, strong sub-max, max for the day |
| STA 21 | 1-breath CO2 ladder | sta-co2-1breath | 1C, 1C+10, 1C+20... +10s/rep, until quality drops |
| STA WU1-7 | warm-up family | sta-warmup | FL progression / FRC progression / contraction-delay / RV+FL / NWU hard start / 3xRV+3xFL / EL-FL alternating |

### DYN sessions

| Source | Exercise | Canonical id | Variant / params |
|--------|----------|--------------|------------------|
| DYN 1 | max dive simulator | dyn-max-simulator | 80% PB, 2xRB, min{60m,30%PB}, 3xRB, max |
| DYN 2 | FRC DYNb + sprints | dyn-frc-sprint | 50-100m FRC, 4xRB, 3x25m sprints with 10/20s recovery, x3 sets |
| DYN 3 | elastic sprint into DNF max | dyn-elastic-sprint-max | 4x15s elastic sprints, 15s rest, max DNF; 2 sets, 3 min between |
| DYN 4 | STA-to-dynamic | dyn-transition-ladder | 2-3x STA to 1C/UTB then FL / crawl / FRC, further each dive |
| DYN 5 | Ex1 long dives | dyn-long-dives | 3 x long, 3 min recovery, maximize distance |
| DYN 5 | Ex2 DNF legs/normal | dyn-volume | 8-10x {50m legs-only, min recovery, 50m normal}; co2+technique |
| DYN 6 | Ex1 descending | dyn-descending | long, -20%, -20% again, minimal recovery |
| DYN 6 | Ex2 sweet 16 | dyn-sweet16 | 16 x 25m fast |
| DYN 7 | DNF pyramid drills | dyn-pyramid | 25-50-75-50-25 for 20 min, 5 min rest, repeat |
| DYN 8 | Ex1 stop-start crawl | dyn-stop-start | STA then slow dynamic crawl |
| DYN 8 | Ex2-4 volume | dyn-volume | 4x/6x/8x any discipline, recovery 2min/1min/30s, maximize distance |
| DYN 9 | Ex1 NWU sub-max | dyn-nwu-submax | 70-80% feel |
| DYN 9 | Ex2 technique | dyn-technique | 4x arms / 4x legs / 4x normal, count strokes |
| DYN 9 | Ex3 50m DNF + sprint | dyn-volume + dyn-sprints | 4x50m DNF 1:15-1:30 rec; then 2x50m sprint |
| DYN 10 | Ex1 slow crawl | dyn-slow-crawl | 50m in max time |
| DYN 10 | Ex2 inverse pyramid | dyn-inverse-pyramid | 2x {75-50-25-50-75} DYNb, recovery < swim time, cap 90s |
| DYN 10 | Ex3 50m sprint | dyn-sprints | 2x50m sprint |
| DYN 11 | Ex1 stop-start | dyn-stop-start | 1:30 STA then 50m+ DNF |
| DYN 11 | Ex2 dive plan | dyn-long-dives | 2x75m DNF, 5 min recovery (mental dive-plan focus) |
| DYN 11 | Ex3 volume | dyn-volume | 3x50m DNF, 1:15 recovery |
| DYN 12 | Ex1 NWU sub-max | dyn-nwu-submax | 70-80% feel |
| DYN 12 | Ex2 volume | dyn-volume | 6x75m DYNb/DYN, 90-120s recovery |
| DYN 12 | Ex3 sprints | dyn-sprints | 2x50m sprint |
| DYN 13 | Ex1 NWU sub-max | dyn-nwu-submax | 70-80% feel |
| DYN 13 | Ex2 inverse pyramid DNF | dyn-inverse-pyramid | 2x {75-50-25-50-75}, full recovery between sets |
| DYN 14 | Ex1 start-stop DNF | dyn-stop-start | 1:30 STA then DNF sub-max (end-zone focus) |
| DYN 14 | Ex2 4x75m DNF | dyn-volume | 4x75m, 3-5 min recovery |
| DYN 14 | Ex3 sprints | dyn-sprints | 6x25m, 15s recovery |
| DYN 14 | Ex "500m hypercapnic" | dyn-hypercapnic | 500m hypercapnic swim (listed, no params) |
| DYN 15 | Ex1 NWU to 1C+ | dyn-nwu-submax | to-1C variant: real discomfort + 3 contractions |
| DYN 15 | Ex2 16x25m | dyn-sweet16 | 16x25m, 30s recovery |
| DYN 16 | Ex1 NWU sub-max | dyn-nwu-submax | 75%+ feel |
| DYN 16 | Ex2 stop-start | dyn-stop-start | 2x {1 min STA + 50m+ DNF}, full recovery |
| DYN 16 | Ex3 volume | dyn-volume | 6x50m DNF, 75-90s recovery |
| DYN 17 | Ex1 broken 200m DYNb | dyn-broken-200 | 75/50/3x25, minimum recovery, consistent pace |
| DYN 17 | Ex2 sprints | dyn-sprints | 4x50m max sprint, max 2 min recovery |
| DYN 18 | Ex1 FRC + sprints | dyn-frc-sprint | 2x {50m FRC, 4xRB, 6x25m sprints, 15s recovery} |
| DYN 18 | Ex2 paced 75s | dyn-volume | 6x75m, recovery < 2 min, fast first 25m, sprint last 50m |
| Cool-down | hypercapnic | dyn-hypercapnic | 300-500m, breathe every 7+ strokes, no stopping |

## Open judgment calls for Emilia

1. Granularity. Many CO2 tables differ only in parameters (recovery breaths, ladder shape). I split them into distinct canonical ids where the *structure* differs (increasing vs V-shape vs 1-breath vs decreasing-recovery vs short-intense), and kept parameter-only differences as variants of one id. Is that the right cut, or do you want finer/coarser canonical types?
2. Composite sessions. Several DYN sessions chain a volume block plus a sprint block (e.g. DYN 9 Ex3). I mapped those to two canonical ids rather than inventing a "volume+sprint" composite. Confirm you want composites decomposed into their primitives.
3. "Any discipline" exercises. NWU sub-max, stop-start, long dives, and the transition ladder are written as "any discipline" in your notes. The schema currently wants a concrete discipline per planned exercise. Confirm these stay discipline-agnostic templates that get a concrete discipline only when scheduled.
4. Warm-ups. I folded the 7 experimental STA warm-ups into one `sta-warmup` canonical with named variants. If you want each warm-up selectable on its own, they should be 7 ids instead.
