"""Single source of truth for the Winnow exercise library.

Defines the canonical exercises (deduped from the two Obsidian library notes)
and the session->canonical mapping, then emits:
  - docs/exercise-canon-and-mapping.xlsx  (human review: catalog + mapping + affinities)
  - seed/fixtures.json                     (the app's seed library, schema-validated)

Run: python seed/build_library.py

Nested sets (DYN 2/17/18): heterogeneous repeated blocks are flattened into
explicit rep rows, with set_repeat for the outer repeat---no recursive group
node. E.g. "2x {50m FRC, 6x25m sprints}" is seven rep rows with set_repeat=2.
"""
import itertools
import json
from collections import defaultdict
from pathlib import Path
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
OUT = str(ROOT / "docs" / "exercise-canon-and-mapping.xlsx")

# ---------------- canonical catalog ----------------
# Each entry: id, name, discipline, allowed_roles, capacity, fixed_structure, editable_options
catalog = [
    # ----- STA -----
    ("sta-nwu-submax", "NWU sub-max or max", "STA", "main",
     "mental, co2, o2_hypoxia",
     "No warmup; one still sub-max hold to read sensations.",
     "HV prep (def 5 min 5:5); recovery (def full)."),
    ("sta-nwu-submax-moving", "NWU sub-max or max (moving)", "STA", "main",
     "mental, co2, o2_hypoxia",
     "No warmup; one sub-max hold with constant movement (paddle hands, move arms, never still).",
     "HV prep (def 5 min soft 4:6, belly only); recovery (def full)."),
    ("sta-co2-increasing", "CO2 5 x RB increasing", "STA", "main",
     "co2",
     "Fixed recovery breaths; holds increase from a start, until failure.",
     "recovery breaths (def 5); start (def 2:00); step (def +20-30s); termination (def until failure)."),
    ("sta-co2-vshape", "CO2 V-shape", "STA", "main",
     "co2",
     "Holds descend toward ~1 min then ascend; maximize total time under discomfort.",
     "recovery breaths (def 2); start (def ~50% PB); HV prep (def 4:6 soft)."),
    ("sta-co2-1breath", "CO2 1 x RB wonka", "STA", "main",
     "co2",
     "1-breath recovery; short repeated holds until quality drops.",
     "ladder mode: absolute|1C+X (def 1C+X); step (def +10s); termination (def quality-drop)."),
    ("sta-co2-short-intense", "CO2 2 x RB repeats", "STA", "main",
     "co2",
     "5-6 FL holds at a sustainable duration, 2-breath recovery only.",
     "n holds (def 6); hold (def sustainable, e.g. 2:30); recovery (def 2 breaths)."),
    ("sta-co2-decreasing-rec", "CO2 classic", "STA", "main",
     "co2, mental",
     "Fixed hold; recovery shrinks each rep.",
     "hold (def sized to contraction duration); recovery start (def 60s); step (def -10s)."),
    ("sta-co2-square", "Box breathing", "STA", "main",
     "mental, co2",
     "Square breathing held for a long duration.",
     "box length (def 10s); duration (def 30 min)."),
    ("sta-co2-second-hold", "CO2 two-hold", "STA", "main",
     "co2",
     "Sub-max, a few recovery breaths, then a max-effort second hold as the target.",
     "first hold (def ~70% PB); recovery breaths (def 3); prep (def 5 min 5:5)."),
    ("sta-get-high", "Get high (oxygen table)", "STA", "main",
     "o2_hypoxia",
     "Strong HV prep before each; add 1 min per hold until it gets hard, then add 30s only.",
     "HV pattern (def 2:2 strong); start hold (def 1 min); step (def +1 min, then +30s once hard)."),
    ("sta-el", "EL reps", "STA", "main, warmup",
     "o2_hypoxia, mental",
     "RV/EL holds, increasing duration.",
     "n (def 5); style: relaxed-belly|pull-and-release (def relaxed-belly); recovery (def 2-3 min)."),
    ("sta-el-fl-switch", "EL/FL switch", "STA", "main, warmup",
     "o2_hypoxia, mental",
     "Alternating EL and FL holds, both increasing.",
     "EL step (def +20s); FL step (def +20-30s); recovery (def 2 min 4:6 HV); as-warmup: stay below PB margins."),
    ("sta-1c-plus", "First contraction plus", "STA", "main",
     "co2, mental",
     "Increasing breathing prep; hold target = 1C + Xs across reps.",
     "prep ramp (def 2->4 min); 1C+X schedule (def +0/20/40/60/80s); recovery mode (def increasing prep|fixed 2 min)."),
    ("sta-frc-awareness", "FL → FRC", "STA", "main",
     "co2",
     "FL then exhale to FRC then a short hold; short recovery only.",
     "hold steps (def 15/30/45s); recovery (def 1 min)."),
    ("sta-high-volume", "High-volume 70-80% PB", "STA", "main",
     "volume, co2, o2_hypoxia",
     "Repeat a % of PB many times.",
     "% PB (def 70); n reps (def 3-10); rest (def long/unlimited); reduce-prep-each-rep (def off)."),
    ("sta-progressive-fl", "Progressive FL", "STA", "main",
     "co2, mental",
     "Comfortable -> strong sub-max -> max(-ish) FL for the day.",
     "prep (def 5 min); sequence (def 3 holds)."),
    ("sta-max", "STA max attempt", "STA", "main",
     "performance",
     "Single maximal breath-hold. The performance test warm-ups are compared against.",
     "HV prep (def 5 min 5:5); lung (def FL)."),
    ("sta-cooldown-easy", "Easy cool-down STA", "STA", "cooldown",
     "mental",
     "Light, relaxed sub-max hold to finish on something easy.",
     "hold (def light submax); recovery (def full)."),
    # STA warm-ups (each its own selectable id)
    ("sta-wu-fl-progression", "WU: FL progression", "STA", "warmup",
     "co2, mental",
     "1C+20 / 1C+40 / 1C+60 FL holds.",
     "steps (def 1C+20/40/60); recovery (def 3 min)."),
    ("sta-wu-frc-progression", "WU: FRC progression", "STA", "warmup",
     "co2",
     "FRC holds through the first hard contractions (not to hypoxia).",
     "n (def 3); recovery (def 3-4 min)."),
    ("sta-wu-contraction-delay", "WU: contraction delay", "STA", "warmup",
     "co2, mental",
     "Repeat holds until 1C arrives at the right time, then go for max.",
     "trigger (def 1C timing feels right)."),
    ("sta-wu-rv-fl", "WU: RV progression + 1 FL", "STA", "warmup",
     "o2_hypoxia, co2",
     "3 RV holds (easy/moderate/hard) + 1 FL.",
     "FL target (def ~1.5 min under PB)."),
    ("sta-wu-nwu-hard-start", "WU: NWU hard start", "STA", "warmup",
     "co2, o2_hypoxia",
     "One hard FL near PB-1min, recover, then max.",
     "hard hold (def PB-1 min); recovery (def 5 min + strong HV)."),
    ("sta-wu-3rv-3fl", "WU: 3xRV + 3xFL", "STA", "warmup",
     "o2_hypoxia",
     "3 EL holds then 3 FL holds.",
     "RV recovery (def 3 min); FL recovery (def 5 min)."),
    # ----- DYN -----
    ("dyn-nwu-submax", "NWU sub-max (dynamic)", "any", "main",
     "mental, o2_hypoxia",
     "~70-80% feel, explore sensations, no fixed distance.",
     "% feel (def 70-80); variant: plain|to-1C+contractions (def plain); discipline (def any; DNF shorter)."),
    ("dyn-max", "Dynamic max attempt", "any", "main",
     "performance",
     "Single maximal distance attempt. The performance test warm-ups are compared against.",
     "discipline (def any; DNF shorter)."),
    ("dyn-max-simulator", "Max dive simulator", "any", "main",
     "o2_hypoxia",
     "80% PB, short dive, then a max push, with breaths between.",
     "% PB (def 80); short leg (def min{60m,30% PB}); RB (def 2 then 3)."),
    ("dyn-volume-fixed", "Volume: fixed reps", "any", "main",
     "volume, co2",
     "N x a fixed distance with a set recovery (NOT goal-maximize).",
     "n reps; distance (def 50/75m; shorter for DNF); recovery; pacing (def even)."),
    ("dyn-volume-maximize", "Volume: maximize total distance", "any", "main",
     "volume, o2_hypoxia",
     "N dives where the goal is maximizing total distance; distance not fixed.",
     "n dives; recovery (often shrinks across session)."),
    ("dyn-volume-technique", "Volume: technique drill", "DNF", "main",
     "technique, co2",
     "Sets alternating legs-only and normal (or arms-only), minimal recovery.",
     "n sets (def 8-10); block (def 50m legs-only + 50m normal); recovery (def minimal)."),
    ("dyn-pyramid", "Pyramid drills", "any", "main",
     "co2, volume",
     "25-50-75-50-25; minimal-but-confident recovery; full recovery between sets.",
     "ladder (def 25-50-75-50-25); recovery (def minimal/confident); n pyramids (user adds as many as wanted); distances shorter for DNF."),
    ("dyn-inverse-pyramid", "Inverse pyramid", "any", "main",
     "co2, volume",
     "75-50-25-50-75; minimal-but-confident recovery.",
     "ladder (def 75-50-25-50-75); recovery (def < swim time, cap 90s); sets (def 2)."),
    ("dyn-descending", "Descending distance", "any", "main",
     "co2",
     "Long doable distance, then ~20% less, then ~20% less again.",
     "start (def long doable); step (def -20%); n (def 3); recovery (def minimal)."),
    ("dyn-sweet16", "Sweet 16", "any", "main",
     "co2, technique",
     "16 x 25m as quickly as possible.",
     "reps (def 16); distance (def 25m); recovery (def 0-30s)."),
    ("dyn-sprints", "Sprint set", "any", "main",
     "fitness_lactic, technique",
     "Max sprints with short recovery.",
     "distance (def 25/50m); n; recovery (short)."),
    ("dyn-frc-sprint", "FRC dive + sprints", "any", "main",
     "fitness_lactic",
     "FRC dive (longest possible) then a max-sprint ladder.",
     "FRC distance (def 50-100m); sprint ladder (def 3x25m, growing recovery); sets (def 3)."),
    ("dyn-elastic-sprint-max", "Elastic sprints into max", "any", "main",
     "fitness_lactic",
     "Elastic-band max sprints then straight into a max dive.",
     "sprints (def 4 x 15s, 15s rest); sets (def 2)."),
    ("dyn-stop-start", "Stop-start (STA then swim)", "any", "main",
     "mental, co2",
     "A STA hold, then straight into a dynamic swim.",
     "STA duration (def 1:30); then distance/sub-max."),
    ("dyn-start-stop", "Start-stop (swim then STA)", "any", "main",
     "mental, co2",
     "A dynamic swim, then straight into a STA hold. (Not in the library; added.)",
     "distance; then STA duration."),
    ("dyn-stop-dyn", "Stop in the middle (dive-STA-dive)", "any", "main",
     "mental, co2",
     "A dynamic, then a STA hold, then another dynamic. (Not in the library; added.)",
     "leg-1 distance; STA duration; leg-2 distance."),
    ("dyn-transition-ladder", "STA-to-dynamic transition ladder", "any", "main",
     "mental, co2",
     "2-3x STA to 1C/UTB then a dynamic, swimming further each dive.",
     "mode: FL|crawl|FRC; n per mode (def 2-3)."),
    ("dyn-technique", "Technique drills", "DNF", "main",
     "technique",
     "Arms-only / legs-only / normal, counting strokes to reduce them.",
     "blocks (def 4x each); count (strokes)."),
    ("dyn-tortuga", "Tortuga (slow crawl)", "tortuga", "main",
     "mental, co2",
     "Its own discipline. Cover a short distance in the longest possible time; max time, distance irrelevant.",
     "distance cap (def 50m)."),
    ("dyn-broken-200", "Broken 200m", "any", "main",
     "co2",
     "75m, 50m, 3x25m with minimum recovery; consistent pace.",
     "structure (def 75/50/3x25); recovery (def minimum, caps 60s/30s/few breaths)."),
    ("dyn-hypercapnic", "Hypercapnic cool-down", "any", "cooldown",
     "co2, volume",
     "Continuous swim, breathing every several strokes, no stopping.",
     "distance (def 300-500m); breathe every (def 7+ strokes)."),
]

# ---------------- mapping (one row per source exercise) ----------------
# section, session, source exercise, role used, canonical id, session params (become editable defaults)
mapping = [
    ("STA", "STA 1", "Ex1 NWU sub-max", "main", "sta-nwu-submax", "5 min strong HV (5:5); full recovery"),
    ("STA", "STA 1", "Ex2 short CO2 table", "main", "sta-co2-increasing", "start 2:00, +20-30s, 5xRB, until failure"),
    ("STA", "STA 2", "Ex1 NWU with movement", "main", "sta-nwu-submax-moving", "5 min soft HV (4:6, belly only); full recovery"),
    ("STA", "STA 2", "Ex2 long CO2 table V-shaped", "main", "sta-co2-vshape", "4 min soft HV, start ~50% PB, 2xRB"),
    ("STA", "STA 3", "EL 2x5", "main", "sta-el", "5x relaxed belly + 5x pull-and-release, 2-3 min recovery"),
    ("STA", "STA 4", "first contraction-plus", "main", "sta-1c-plus", "2-4 min prep; 1C +0/20/40/60/80s; alt fixed 2-min recovery"),
    ("STA", "STA 5", "CO2 awareness", "main", "sta-frc-awareness", "FL->FRC, 15/30/45s, 1-min recovery"),
    ("STA", "STA 6", "1-breath table", "main", "sta-co2-1breath", "20-60s FL, 1xRB, moderate urge throughout"),
    ("STA", "STA 7", "get high (O2 table)", "main", "sta-get-high", "2:2 super-strong HV, +30s holds"),
    ("STA", "STA 8", "high-volume", "main", "sta-high-volume", "70% PB x3-10, unlimited rest"),
    ("STA", "STA 8", "(warm-up: 1-3 FRC)", "warmup", "sta-wu-frc-progression", "1-3 FRC holds before the volume work"),
    ("STA", "STA 9", "EL/FL switch", "main", "sta-el-fl-switch", "2 min 4:6 HV recovery; EL +20s / FL +20-30s"),
    ("STA", "STA 10", "high-volume CO2 table", "main", "sta-high-volume", "reduced-prep variant ON; 70% PB x3"),
    ("STA", "STA 10", "(warm-up: 3 RV + 1 FL)", "warmup", "sta-wu-rv-fl", "3 RV holds + 1 long FL"),
    ("STA", "STA 11", "Ex1 6xEL", "main", "sta-el", "6 holds, 2-3 min 5:5 HV"),
    ("STA", "STA 11", "Ex2 1xFL", "main", "sta-progressive-fl", "5 min 5:5 HV, 1 FL at 70-80% PB (single-hold case)"),
    ("STA", "STA 12", "breathing-cycle 1C ladder", "main", "sta-1c-plus", "cycles 10/15/20/25/30; 1C +0/20/40/60 then submax/max"),
    ("STA", "STA 13", "oxygen table", "main", "sta-get-high", "growing prep + holds +20-40s"),
    ("STA", "STA 14", "oxygen table", "main", "sta-get-high", "2 min recovery only, +1 min each, until failure"),
    ("STA", "STA 15", "short & intense CO2", "main", "sta-co2-short-intense", "5-6 FL, 2-breath recovery (e.g. 6x2:30)"),
    ("STA", "STA 15", "(warm-up: 2 FRC)", "warmup", "sta-wu-frc-progression", "2 easy FRC to 4-5 contractions, full recovery"),
    ("STA", "STA 16", "medium & moderate CO2", "main", "sta-co2-decreasing-rec", "hold sized to contraction duration; recovery 60s->10s"),
    ("STA", "STA 16", "(warm-up: 2 FRC)", "warmup", "sta-wu-frc-progression", "2 easy FRC to 4-5 contractions, full recovery"),
    ("STA", "STA 17", "soft & medium CO2", "main", "sta-co2-square", "10s square breathing, 30 min"),
    ("STA", "STA 18", "hypoxia & CO2", "main", "sta-get-high", "2:2 HV, +30s each, target 90s-1min below PB"),
    ("STA", "STA 19", "challenging second hold", "main", "sta-co2-second-hold", "70% PB, 3 RB, max second hold"),
    ("STA", "STA 20", "Ex1 warm-up", "warmup", "sta-wu-frc-progression", "3 FRC progressive + 2 FL 1C+30-60"),
    ("STA", "STA 20", "Ex2 progressive FL", "main", "sta-progressive-fl", "comfortable -> strong sub-max -> max for the day"),
    ("STA", "STA 21", "1-breath CO2 ladder", "main", "sta-co2-1breath", "1C, 1C+10, 1C+20... +10s/rep, until quality drops"),
    ("STA", "STA WU1", "FL progression", "warmup", "sta-wu-fl-progression", "1C+20/40/60, 3 min recovery"),
    ("STA", "STA WU2", "FRC progression", "warmup", "sta-wu-frc-progression", "3 FRC, 3-4 min recovery"),
    ("STA", "STA WU3", "contraction delay", "warmup", "sta-wu-contraction-delay", "repeat to 1C then max once timed right"),
    ("STA", "STA WU4", "RV progression + 1 FL", "warmup", "sta-wu-rv-fl", "3 RV + 1 FL to 1.5 min under PB"),
    ("STA", "STA WU5", "NWU hard start", "warmup", "sta-wu-nwu-hard-start", "hard FL to PB-1min, recover, then max"),
    ("STA", "STA WU6", "3xRV + 3xFL", "warmup", "sta-wu-3rv-3fl", "3 EL (3 min rec) + 3 FL (5 min rec)"),
    ("STA", "STA WU7", "alternating EL/FL", "warmup", "sta-el-fl-switch", "EL/FL below PB margins (same exercise as STA 9, used as warm-up)"),
    # ----- DYN -----
    ("DYN", "DYN 1", "max dive simulator", "main", "dyn-max-simulator", "80% PB, 2xRB, min{60m,30%PB}, 3xRB, max"),
    ("DYN", "DYN 2", "FRC DYNb + sprints", "main", "dyn-frc-sprint", "50-100m FRC, 4xRB, 3x25m sprints 10/20s rec, x3 sets"),
    ("DYN", "DYN 3", "elastic sprint into DNF max", "main", "dyn-elastic-sprint-max", "4x15s elastic, 15s rest, max DNF; 2 sets"),
    ("DYN", "DYN 4", "STA-to-dynamic", "main", "dyn-transition-ladder", "2-3x STA to 1C/UTB then FL/crawl/FRC, further each dive"),
    ("DYN", "DYN 5", "Ex1 long dives", "main", "dyn-volume-maximize", "3 x long, 3 min recovery, MAXIMIZE total distance"),
    ("DYN", "DYN 5", "Ex2 DNF legs/normal", "main", "dyn-volume-technique", "8-10x {50m legs-only, 50m normal}; DNF"),
    ("DYN", "DYN 6", "Ex1 descending", "main", "dyn-descending", "long, -20%, -20% again, minimal recovery"),
    ("DYN", "DYN 6", "Ex2 sweet 16", "main", "dyn-sweet16", "16 x 25m fast"),
    ("DYN", "DYN 7", "DNF pyramid drills", "main", "dyn-pyramid", "25-50-75-50-25, ~20 min worth of pyramids, 5 min rest, then another set"),
    ("DYN", "DYN 8", "Ex1 stop-start crawl", "main", "dyn-stop-start", "STA then slow dynamic crawl"),
    ("DYN", "DYN 8", "Ex2-4 maximize", "main", "dyn-volume-maximize", "4x/6x/8x any discipline; recovery 2min/1min/30s; MAXIMIZE total distance"),
    ("DYN", "DYN 9", "Ex1 NWU sub-max", "main", "dyn-nwu-submax", "70-80% feel"),
    ("DYN", "DYN 9", "Ex2 technique", "main", "dyn-technique", "4x arms / 4x legs / 4x normal, count strokes (DNF)"),
    ("DYN", "DYN 9", "Ex3 50m DNF (volume)", "main", "dyn-volume-fixed", "4x50m DNF, 1:15-1:30 recovery"),
    ("DYN", "DYN 9", "Ex3 50m DNF (sprint)", "main", "dyn-sprints", "2x50m sprint"),
    ("DYN", "DYN 10", "Ex1 slow crawl (tortuga)", "main", "dyn-tortuga", "50m in max time"),
    ("DYN", "DYN 10", "Ex2 inverse pyramid", "main", "dyn-inverse-pyramid", "2x {75-50-25-50-75} DYNb, recovery < swim time, cap 90s"),
    ("DYN", "DYN 10", "Ex3 50m sprint", "main", "dyn-sprints", "2x50m sprint"),
    ("DYN", "DYN 11", "Ex1 stop-start", "main", "dyn-stop-start", "1:30 STA then 50m+ DNF"),
    ("DYN", "DYN 11", "Ex2 dive plan", "main", "dyn-volume-fixed", "2x75m DNF, 5 min recovery (mental dive-plan focus)"),
    ("DYN", "DYN 11", "Ex3 volume", "main", "dyn-volume-fixed", "3x50m DNF, 1:15 recovery"),
    ("DYN", "DYN 12", "Ex1 NWU sub-max", "main", "dyn-nwu-submax", "70-80% feel"),
    ("DYN", "DYN 12", "Ex2 volume", "main", "dyn-volume-fixed", "6x75m DYNb/DYN, 90-120s recovery (turns/technique focus)"),
    ("DYN", "DYN 12", "Ex3 sprints", "main", "dyn-sprints", "2x50m sprint"),
    ("DYN", "DYN 13", "Ex1 NWU sub-max", "main", "dyn-nwu-submax", "70-80% feel"),
    ("DYN", "DYN 13", "Ex2 inverse pyramid DNF", "main", "dyn-inverse-pyramid", "2x {75-50-25-50-75}, full recovery between sets"),
    ("DYN", "DYN 14", "Ex1 start-stop DNF", "main", "dyn-stop-start", "1:30 STA then DNF sub-max (library labeled 'start-stop'; structurally STA->dive)"),
    ("DYN", "DYN 14", "Ex2 4x75m DNF", "main", "dyn-volume-fixed", "4x75m, 3-5 min recovery"),
    ("DYN", "DYN 14", "Ex3 sprints", "main", "dyn-sprints", "6x25m, 15s recovery"),
    ("DYN", "DYN 14", "500m hypercapnic", "cooldown", "dyn-hypercapnic", "500m hypercapnic swim (listed, no params)"),
    ("DYN", "DYN 15", "Ex1 NWU to 1C+", "main", "dyn-nwu-submax", "variant=to-1C: real discomfort + 3 contractions"),
    ("DYN", "DYN 15", "Ex2 16x25m", "main", "dyn-sweet16", "16x25m, 30s recovery"),
    ("DYN", "DYN 16", "Ex1 NWU sub-max", "main", "dyn-nwu-submax", "75%+ feel"),
    ("DYN", "DYN 16", "Ex2 stop-start", "main", "dyn-stop-start", "2x {1 min STA + 50m+ DNF}, full recovery"),
    ("DYN", "DYN 16", "Ex3 volume", "main", "dyn-volume-fixed", "6x50m DNF, 75-90s recovery"),
    ("DYN", "DYN 17", "Ex1 broken 200m DYNb", "main", "dyn-broken-200", "75/50/3x25, minimum recovery, consistent pace"),
    ("DYN", "DYN 17", "Ex2 sprints", "main", "dyn-sprints", "4x50m max sprint, max 2 min recovery"),
    ("DYN", "DYN 18", "Ex1 FRC + sprints", "main", "dyn-frc-sprint", "2x {50m FRC, 4xRB, 6x25m sprints, 15s recovery}"),
    ("DYN", "DYN 18", "Ex2 paced 75s", "main", "dyn-volume-fixed", "6x75m, recovery < 2 min, fast first 25m, sprint last 50m"),
    ("DYN", "Cool-down", "hypercapnic", "cooldown", "dyn-hypercapnic", "300-500m, breathe every 7+ strokes, no stopping"),
]

cat_by_id = {c[0]: c for c in catalog}

# sanity: every mapping canonical id must exist
missing = sorted({m[4] for m in mapping} - set(cat_by_id))
assert not missing, f"mapping refers to unknown ids: {missing}"

# ---------------- affinities (co-occurrence within a source session) ----------------
session_ids = defaultdict(list)
for (section, session, ex, role, cid, params) in mapping:
    if cid not in session_ids[session]:
        session_ids[session].append(cid)
pair_sessions = defaultdict(list)
for session, ids in session_ids.items():
    for a, b in itertools.combinations(sorted(ids), 2):
        pair_sessions[(a, b)].append(session)
affinities = sorted(pair_sessions.items(), key=lambda kv: (-len(kv[1]), kv[0]))

# ---------------- workbook ----------------
wb = openpyxl.Workbook()

ws2 = wb.active
ws2.title = "Canonical catalog"
ws2.append(["Canonical id", "Name", "Discipline", "Allowed roles", "Capacity focus",
            "Fixed structure", "Editable options (defaults)"])
for c in catalog:
    ws2.append(list(c))

ws = wb.create_sheet("Mapping (combined)")
ws.append(["Section", "Session", "Source exercise", "Role used", "Canonical id",
           "Canonical name", "Discipline", "Allowed roles", "Capacity focus",
           "Fixed structure", "Session params (-> editable defaults)"])
for (section, session, ex, role, cid, params) in mapping:
    c = cat_by_id[cid]
    ws.append([section, session, ex, role, cid, c[1], c[2], c[3], c[4], c[5], params])

ws3 = wb.create_sheet("Affinities")
ws3.append(["Exercise A", "Exercise B", "# sessions together", "Sessions"])
for (a, b), sessions in affinities:
    ws3.append([a, b, len(sessions), ", ".join(sessions)])

# ---------------- styling ----------------
hdr_fill = PatternFill("solid", fgColor="4F6138")
hdr_font = Font(color="FFFFFF", bold=True, size=11)
thin = Side(style="thin", color="D9D9D9")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
warm_fill = PatternFill("solid", fgColor="EAF1DC")

def style_sheet(ws, widths, role_col=None):
    ws.freeze_panes = "A2"
    for j, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(j)].width = w
    for cell in ws[1]:
        cell.fill = hdr_fill; cell.font = hdr_font
        cell.alignment = Alignment(vertical="center", horizontal="left", wrap_text=True)
    for row in ws.iter_rows(min_row=2):
        is_wu = role_col is not None and str(row[role_col].value) == "warmup"
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = border
            if is_wu:
                cell.fill = warm_fill
    ws.auto_filter.ref = ws.dimensions

style_sheet(ws2, [24, 30, 10, 13, 22, 46, 52])
style_sheet(ws, [8, 11, 24, 9, 22, 26, 10, 13, 20, 40, 44], role_col=3)
style_sheet(ws3, [24, 24, 12, 40])

wb.save(OUT)

# ---------------- seed/fixtures.json (single source of truth) ----------------
FIXTURES = str(ROOT / "seed" / "fixtures.json")

# primary role per template (allowed_roles is a higher-level concept the
# Phase 0a schema does not model; the seed carries the primary role).
WARMUP_IDS = {c[0] for c in catalog if c[3] == "warmup"}
COOLDOWN_IDS = {"sta-cooldown-easy", "dyn-hypercapnic"}

def role_for(cid):
    if cid in WARMUP_IDS:
        return "warmup"
    if cid in COOLDOWN_IDS:
        return "cooldown"
    return "main"

SHAPE = {
    "dyn-stop-start": "stop-start",
    "dyn-start-stop": "start-stop",
    "dyn-stop-dyn": "stop-in-the-middle",
    "dyn-hypercapnic": "continuous-protocol",
    "sta-co2-square": "continuous-protocol",
}
ENV = {"sta-co2-square": "dry"}  # everything else defaults to pool

# Termination describes only how a set ENDS. A fixed_n carries NO count: the
# planned count is reps.length x set_repeat (see plannedRepCount in the app). So
# only the genuinely open-ended / capped / range cases are listed here; every
# other exercise defaults to {"type": "fixed_n"} with the count in its reps.
TERMINATION = {
    "sta-co2-increasing": {"type": "until_failure"},
    "sta-get-high": {"type": "until_failure"},
    "sta-el-fl-switch": {"type": "until_failure"},
    "sta-co2-1breath": {"type": "until_quality_drops"},
    "sta-co2-square": {"type": "duration_capped", "duration_s": 1800},
    "dyn-transition-ladder": {"type": "range", "n_min": 2, "n_max": 3},
}

# Outer-repeat count (default 1 elsewhere): flattened nested sets, plus the
# "identical reps" tables encoded as one rep row repeated N times rather than as
# N listed rows. Total planned reps is always reps.length x set_repeat.
SET_REPEAT = {
    "dyn-frc-sprint": 2,
    "sta-co2-short-intense": 6,  # 6 identical sustainable FL holds, 2-breath rec
    "sta-el": 5,                 # 5 EL holds (durations set per-rep as they climb)
    "dyn-sweet16": 16,           # 16 x 25m sprints
}

# Pre-built rep rows for the compound / nested-set exercises, so a fresh install
# (or a device after "Refresh library") gets the real structure instead of one
# placeholder rep. Everything else defaults to a single editable rep below.
_BREATHS = lambda n: {"type": "absolute", "value": n, "unit": "breaths"}
_SECS = lambda n: {"type": "absolute", "value": n, "unit": "time"}
_MINIMAL = {"type": "qualitative", "value": "minimal"}
_FULL = {"type": "qualitative", "value": "full"}
REPS = {
    # DYN 1: 80% PB, short leg (min{60m,30% PB}), then a max push.
    "dyn-max-simulator": [
        {"shape": "simple", "distance_target": {"unit": "pct_pb", "value": 80},
         "recovery": _BREATHS(2), "note": "80% PB dive"},
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": 60},
         "recovery": _BREATHS(3), "note": "short leg (min{60m, 30% PB})"},
        {"shape": "simple", "distance_target": {"unit": "qualitative", "value": "max"},
         "note": "max push"},
    ],
    # DYN 17 Ex1: broken 200m, 75/50/3x25, minimum recovery, consistent pace.
    "dyn-broken-200": [
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": 75}, "recovery": _MINIMAL},
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": 50}, "recovery": _MINIMAL},
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": 25}, "recovery": _MINIMAL},
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": 25}, "recovery": _MINIMAL},
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": 25}},
    ],
    # DYN 2 / DYN 18 Ex1: 2x {50m FRC, 4 breaths, 6x25m sprints, 15s recovery}.
    "dyn-frc-sprint": [
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": 50},
         "recovery": _BREATHS(4), "lung_volume": "FRC", "note": "FRC"},
        *[{"shape": "simple", "distance_target": {"unit": "absolute", "value": 25},
           "recovery": _SECS(15), "pace": "sprint", "note": "sprint"} for _ in range(6)],
    ],
    # STA 15: 6 identical sustainable FL holds (e.g. 2:30), 2-breath recovery.
    # One rep row repeated 6x via SET_REPEAT.
    "sta-co2-short-intense": [
        {"shape": "simple", "hold_target": {"unit": "absolute", "value": 150},
         "recovery": _BREATHS(2)},
    ],
    # STA 2: V-shaped CO2 table, holds descend 2:30 -> 1:00 then climb back up,
    # 2-breath recovery throughout.
    "sta-co2-vshape": [
        {"shape": "simple", "hold_target": {"unit": "absolute", "value": s},
         "recovery": _BREATHS(2)}
        for s in (150, 135, 120, 105, 90, 60, 60, 90, 105, 120, 135, 150)
    ],
    # STA 16: fixed sub-max hold, recovery shrinks 60s -> 10s across 7 reps.
    "sta-co2-decreasing-rec": [
        {"shape": "simple", "hold_target": {"unit": "qualitative", "value": "submax"},
         "recovery": _SECS(r)} for r in (60, 50, 40, 30, 20, 15, 10)
    ],
    # STA 4 / STA 12: 1C+X ladder, +20s per rep, fixed ~2 min recovery.
    "sta-1c-plus": [
        {"shape": "simple", "hold_target": {"unit": "contraction_relative", "value": x},
         "recovery": _SECS(120)} for x in (0, 20, 40, 60, 80)
    ],
    # STA 5: each step is a 1 min FL hold, exhale to FRC with no breath (0s
    # recovery), then an FRC hold of 15/30/45s. Both holds count toward time
    # under breath-hold; 1 min recovery between steps builds difficulty.
    "sta-frc-awareness": [
        rep
        for s in (15, 30, 45)
        for rep in (
            {"shape": "simple", "hold_target": {"unit": "absolute", "value": 60},
             "lung_volume": "FL", "recovery": _SECS(0), "note": "exhale to FRC, no breath"},
            {"shape": "simple", "hold_target": {"unit": "absolute", "value": s},
             "lung_volume": "FRC", "recovery": _SECS(60)},
        )
    ],
    # STA 20: comfortable -> strong sub-max -> max-ish FL, full recovery between.
    "sta-progressive-fl": [
        {"shape": "simple", "hold_target": {"unit": "qualitative", "value": "submax"}, "recovery": _FULL},
        {"shape": "simple", "hold_target": {"unit": "qualitative", "value": "strong_submax"}, "recovery": _FULL},
        {"shape": "simple", "hold_target": {"unit": "qualitative", "value": "max"}},
    ],
    # DYN 6 Ex1: long doable distance, then ~20% less, then ~20% less again.
    "dyn-descending": [
        {"shape": "simple", "distance_target": {"unit": "qualitative", "value": "long (doable)"}, "recovery": _MINIMAL},
        {"shape": "simple", "distance_target": {"unit": "qualitative", "value": "~20% less"}, "recovery": _MINIMAL},
        {"shape": "simple", "distance_target": {"unit": "qualitative", "value": "~20% less again"}},
    ],
    # DYN 7: 25-50-75-50-25 pyramid, minimal-but-confident recovery. Add reps to
    # extend; full recovery between sets.
    "dyn-pyramid": [
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": d}, "recovery": _MINIMAL}
        for d in (25, 50, 75, 50, 25)
    ],
    # DYN 10 / DYN 13: 75-50-25-50-75 inverse pyramid, recovery < swim time, cap 90s.
    "dyn-inverse-pyramid": [
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": d},
         "recovery": {"type": "cap", "value": 90, "unit": "time"}}
        for d in (75, 50, 25, 50, 75)
    ],
    # DYN 6 Ex2 / DYN 15: 16 x 25m sprints, minimal recovery. One rep repeated 16x.
    "dyn-sweet16": [
        {"shape": "simple", "distance_target": {"unit": "absolute", "value": 25},
         "pace": "sprint", "recovery": _MINIMAL},
    ],
}

# Uniform lung volume / speed for exercises whose whole structure is one volume
# or one speed (applied to every rep). Multi-volume exercises (EL/FL switch) keep
# the default and are set per-rep in the app; REPS-defined exercises above carry
# their own. lung_volume uses the schema codes FL/FRC/RV (RV is empty lung / EL).
LUNG = {
    "sta-el": "RV",
    "sta-frc-awareness": "FRC",
    "sta-wu-frc-progression": "FRC",
}
SPEED = {
    "dyn-sprints": "sprint",
}
# Exercises logged as a summary (lap distance + total time + rep count) rather
# than rep by rep. Everything else defaults to per_rep.
LOG_MODE = {
    "dyn-sweet16": "aggregate",
}

templates = []
for (cid, name, discipline, allowed_roles, capacity, structure, options) in catalog:
    caps = [c.strip() for c in capacity.split(",")]
    reps = REPS.get(cid, [{"shape": SHAPE.get(cid, "simple")}])
    # REPS-defined exercises carry their own per-rep lung/speed; for the rest,
    # stamp a uniform lung volume / speed onto the placeholder rep when known.
    if cid not in REPS:
        for r in reps:
            if cid in LUNG:
                r["lung_volume"] = LUNG[cid]
            if cid in SPEED:
                r["pace"] = SPEED[cid]
    templates.append({
        "schema_version": 1,
        "id": cid,
        "name": name,
        "environment": ENV.get(cid, "pool"),
        "role": role_for(cid),
        "discipline": discipline,
        "capacity_tags": caps,
        "goal": structure,
        "cues": options,
        "log_mode": LOG_MODE.get(cid, "per_rep"),
        "set_repeat": SET_REPEAT.get(cid, 1),
        "termination": TERMINATION.get(cid, {"type": "fixed_n"}),
        "reps": reps,
    })

# Convention guard: a fixed_n termination must carry no count. The planned rep
# count lives in reps.length x set_repeat, so a stray "n" here would reintroduce
# the two-sources-of-truth bug.
for t in templates:
    term = t["termination"]
    assert not (term.get("type") == "fixed_n" and "n" in term), (
        f"{t['id']}: fixed_n must not carry n (count = reps x set_repeat)"
    )

affinity_records = [
    {"exercises": [a, b], "weight": len(sessions), "sessions": sessions}
    for (a, b), sessions in affinities
]

fixtures = {"schema_version": 1, "templates": templates, "affinities": affinity_records}
with open(FIXTURES, "w", encoding="utf-8") as f:
    json.dump(fixtures, f, indent=2, ensure_ascii=False)
    f.write("\n")

print("wrote", OUT)
print("wrote", FIXTURES)
print("catalog:", len(catalog), "| mapping rows:", len(mapping),
      "| affinity pairs:", len(affinities), "| templates:", len(templates))
