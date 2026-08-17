# A basic Seals program built on Jeranko's sequencing

This is a first structure for the Seals edition of Winnow: a simplified 12-week program that keeps the sequencing of Samo Jeranko's 25-week performance program and drops its intensity to club level.
The source analysis lives in the private repo, [freedive/docs/programs/extracted/periodization-patterns.md](file:///C:/git/freedive/docs/programs/extracted/periodization-patterns.md), with the week-by-week extractions beside it; nothing from those PDFs is copied here verbatim, and the Seals edition ships an adaptation, not the program.
Every number below is a proposal to be tuned by Emilia and the coach, not a value read off a source, except where a column says "Jeranko" and gives his figure for comparison.

Three substitutions apply throughout.
First, every short-rest set that Jeranko swims as DNF becomes DYNB (bifins), and DYNB is the default for every dynamic exercise except tortuga, which stays its own discipline.
Second, packing is gone everywhere.
Third, distances and rests are set for a template student who swims DYNB around 75 m, and every distance is a knob the coach can turn down to 25 m.
Static is out of the Seals edition for now, so the dry day below is Emilia's own program only and the club version is the two pool sessions.

## Tag vocabulary

Two tag dimensions encode the sequencing.
The capacity tags already exist in the schema (`co2`, `o2_hypoxia`, `fitness_lactic`, `technique`, `mental`, `performance`).
The phase tags are new and name where in the cycle an exercise belongs: `base`, `build`, `specialization`, `taper`.
An exercise can have more than one phase tag; the hypercapnic swim, for instance, appears in every phase and only its distance changes.
Adding a `phase_tags` array to the template schema, next to `capacity_tags`, is the schema change the Seals edition needs, and it doubles as the "show me base-phase exercises" filter in the library.

The phase tags follow Jeranko's four blocks.
Base is CO2 tolerance: short-rest sets, pyramids, hypercapnic swimming, dry CO2 tables.
Build adds speed and the first submax dives while the CO2 work tightens.
Specialization is submax dives at a rising percentage of PB plus an endurance ladder, with the dry day moving from CO2 to O2 work.
Taper is the same sessions with the interval count cut week on week and intensity held.

## Weekly skeleton

Two pool sessions a week for the club (Jeranko and Emilia's own version add a dry static day between them), with a rest day before each pool session and no hard session two days running.
Jeranko adds a gym day; the Seals edition leaves strength work out of the app for now, since the coach cannot supervise it and it needs its own tags and estimator.
The pool session order is fixed all cycle and follows the hard-first rule: the most demanding apnea comes first, sprints or intervals second, the hypercapnic swim third, an easy 100 m recovery swim last.

| Day | Session | Base (weeks 1–4) | Build (5–8) | Specialization (9–12) |
|---|---|---|---|---|
| Pool 1 | O2 and CO2 | fixed-rest set, pyramid, hypercapnic swim | submax dive, dolphin sprints, hypercapnic swim | submax dive, endurance ladder, tortuga |
| Dry (not in Seals edition) | static | CO2 table | warm-up ladder + submax, CO2 table | odd weeks warm-up ladder + submax; even weeks FRC O2 table |
| Pool 2 | CO2 sprints | over-under warm-up, sprints, hypercapnic swim | over-under warm-up, longer sprints, hypercapnic swim | fixed-rest set, tortuga, hypercapnic swim |

## Exercise catalog

Ten pool exercises cover the Seals program (the three static exercises are listed after them for Emilia's own version and are not in the Seals edition).
Six of the ten already exist in the canonical library and only need Seals defaults and phase tags; four are new.
"Seals default" is the setting the template student sees; "Jeranko" is his figure at the same point in the program, for calibration only.

| Exercise | Discipline | Capacity | Phase | Seals default | Jeranko | Canonical id |
|---|---|---|---|---|---|---|
| Fixed-rest set | DYNB | co2 | base, specialization, taper | base: 4–7 x 50 m, cap 60 s; specialization: 6 x 50 m, cap 45 s; taper: 5 then 4 x 50 m, cap 45 s; dive pace | 4–7 x 50 m DNF, cap 45 s | dyn-volume-fixed |
| Pyramid | DYNB | co2 | base | 50-25-25-50, rest ≤ 60 s | 75-50-25-50-75 DYN, rest as short as possible | dyn-pyramid |
| Hypercapnic surface swim | any (freestyle, short fins) | co2 | all four | base: 100–250 m; build: 300–350 m; specialization: 400 m; taper: 300 then 200 m; 3 breaths per 25 m | 200 m, 2–3 breaths per 25 m | dyn-hypercapnic |
| Recovery swim | any | (none) | all four | 100 m, any style, relaxed | same | new: swim-recovery |
| Over-under warm-up | DYNB | technique | base, build | 100 m as 25 m freestyle + 25 m DYNB, twice | same | new: dyn-over-under |
| Sprints | DYNB | fitness_lactic | base, build | base: 2 x 6 x 25 m, 20 s between, 2 min between sets, then 6 x 50 m at 60 s; build: 5–6 x 75 m, 75–120 s | 3 x 8 x 25 m, 15 s, 2 min | dyn-sprints |
| Dolphin sprints (surface + duck dive) | DYNB | fitness_lactic | build | 2 x 4 x (25 m surface + 10 m under), 60–90 s, 3 min between sets | 2 x 4 x (55 m + 20 m) | new: dyn-dolphin-sprint |
| Submax dive | DYNB | o2_hypoxia, mental | build, specialization, taper | build: 65% of PB; specialization: 70–75%; taper: 80%; no upper limit, no packing | 65% then 70–80% then 80–90% with packing | dyn-nwu-submax |
| Endurance ladder | DYNB | co2, volume | specialization | 1 x 75 + 5 x 50, rest ≤ dive time; convert one 50 into a 75 each week | 2 x 75 + 6 x 50 DNF to 8 x 75 | new: dyn-endurance-ladder |
| Tortuga | tortuga | mental, co2 | build, specialization | cover at most 50 m in the longest possible time | same | dyn-tortuga |
| Dry CO2 table | STA | co2 | base, build | 10 min of comfortable holds, 4 breaths between (base), 3 (build) | 15 min of max holds, 2 breaths then 1 | sta-co2-short-intense |
| Static warm-up ladder + submax | STA | co2, mental | build, specialization, taper | hold to first contraction, 3 min breathe-up, hold to 1C + 30 s, 5 min breathe-up, one submax at 80–90% feel | three holds to 10/15/20 contractions with packing, then one max | sta-wu-contraction-delay |
| FRC O2 table | STA | o2_hypoxia | specialization | 4 x FRC hold at 60–70% of comfortable FRC max, 2.5 min rest | 6 holds, FRC then empty lung, 70–90% of EL max, 3 to 1.5 min | sta-wu-frc-progression |

Two of the mappings need a knob the canonical exercise does not yet have.
The dry CO2 table maps to `sta-co2-short-intense` only if its termination can be a duration cap (10 min) rather than a fixed count; the schema has `duration_capped`, so this is a default change, not a schema change.
The static warm-up ladder maps to `sta-wu-contraction-delay` if it gains a per-rep breathe-up duration and a 1C-plus second hold, which `sta-1c-plus` already models, so the cleanest path is one merged Seals warm-up template rather than stretching either.

Where an exercise recurs across phases with different reps, distance, or rest (the fixed-rest set, the hypercapnic swim, the sprints, the submax dive), the phase belongs in the exercise's defaults, not in its name.
One template per exercise, with a `phase_defaults` block keyed by phase tag, so that choosing "specialization" in the builder fills reps 6 and rest cap 45 s while the exercise itself, its cues, and its logging stay one thing.
Separate templates per phase (`fixed-rest-base`, `fixed-rest-specialization`) would triple the library and split the training history of what is one exercise.
For the mockup the per-phase defaults are written into the Seals default column; the `phase_defaults` block is an app change for the Seals build.

## Block by block

Weeks 1–4, base.
Pool 1: fixed-rest set (4, 5, 6, 7 x 50 m DYNB across the four weeks, rest cap 60 s throughout), pyramid (50-25-25-50 in weeks 1–2, 50-50-25-50-50 in weeks 3–4), hypercapnic swim (100, 150, 200, 250 m), recovery swim.
Dry (Emilia's version only): CO2 table, 10 min, 4 breaths between holds, holds kept comfortable, meaning to the first strong contractions and no further.
Pool 2: over-under warm-up, sprints (2 x 6 x 25 m at 20 s in weeks 1–2; 6 x 50 m at 60 s in weeks 3–4), hypercapnic swim as on pool 1, recovery swim.
One variable moves per week: the rep count on pool 1, the sprint distance on pool 2, the swim distance on both.

Weeks 5–8, build.
Pool 1: submax dive at 65% of PB in weeks 6 and 8 only, dolphin sprints (2 x 4 in weeks 5–6, 2 x 5 in weeks 7–8), hypercapnic swim (300, 300, 350, 350 m), recovery swim.
Dry (Emilia's version only): warm-up ladder plus one submax, then after 10 min of tidal breathing the CO2 table at 3 breaths between holds.
Pool 2: over-under warm-up, sprints at 75 m (5, 5, 6, 6 reps, rest 75–120 s), hypercapnic swim as on pool 1, recovery swim.
Tortuga enters on pool 2 in week 5 as a single relaxed slow crawl after the sprints and stays there for the rest of the cycle.

Weeks 9–12, specialization, with weeks 11–12 as the taper.
Pool 1: submax dive at 70–75% of PB every week (80% in weeks 11–12), endurance ladder (1 x 75 + 5 x 50, then 2 x 75 + 4 x 50, then 3 + 3, then 4 + 2), tortuga, recovery swim.
Dry (Emilia's version only): odd weeks warm-up ladder plus one submax; even weeks the FRC O2 table, four holds at 60% in week 10 and 70% in week 12.
Pool 2: fixed-rest set (6 x 50 m in weeks 9–10, then 5 x 50 in week 11 and 4 x 50 in week 12, rest cap 45 s), tortuga, hypercapnic swim (400 m in weeks 9–10, 300 in week 11, 200 in week 12), recovery swim.
The taper cuts volume only: interval count and swim distance fall in weeks 11–12 while the submax percentage rises to 80%.

## What changed relative to Jeranko, and why

The cycle is 12 weeks instead of 25 because the Seals edition is a first structure for club members who have not committed to a competition, and Jeranko's block proportions (4 : 4 : 8 : 8 plus a competition week) compress to 4 : 4 : 2 : 2 without losing the order.
The DNF-to-DYNB substitution is Emilia's, and it turns his hardest sets into ones a bifin diver can keep form on.
Empty-lung statics are out; the reduced-lung O2 stimulus stops at FRC, which is the conservative end of his ladder, and it enters only in the last block, on the coach's dry day, so it never happens unsupervised.
Max attempts are out; the weekly test in his program is the max at the end of the static ladder, and here it is a submax at 80–90% feel, which still reads week to week as long as the ladder in front of it does not change.
The gym stays out of scope, for the supervision reason given under the weekly skeleton.
Rest caps are 15 s longer than his throughout, submax starts and ends 10–15 percentage points lower, and the sprint distance tops out at 75 m instead of 100 m.

## What the estimator needs from this

The session-time estimate in the builder resolves percentage-of-PB targets and qualitative recoveries against the device's settings, so the coach's phone needs a template student profile (DYNB PB, DYNB pace in seconds per 25 m, breath length; STA PB and a first-contraction baseline once static comes in) to time these sessions before any member has entered a number.
With static out, every Seals exercise is absolute distances and rests, or a percentage of the DYNB PB, and times cleanly; the two static exercises that need a planning input (the duration-capped CO2 table and the contraction-relative warm-up ladder) can wait.

## Open choices for Emilia and the coach

The template student's numbers: DYNB 75 m is a placeholder.
Whether the fixed-rest set defaults to 50 m or 25 m for the club; 50 m assumes a 25 m pool and members who swim 75 m plus.
When static comes into the Seals edition, and whether the FRC O2 table belongs in a club edition at all or only in coach-led sessions.
Whether to keep the 12-week compression or use Jeranko's proportions over 16 weeks (4 : 4 : 5 : 3).
Which of the four new exercises (recovery swim, over-under, dolphin sprints, endurance ladder) are worth adding to the canonical library too, since the Seals edition is built by filtering the canon, not by forking it.
