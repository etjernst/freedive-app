# Spec: freedive capture, tracking, and coaching app

Status: draft for approval.
Mode: Implementation (spec stage). No code until this and a plan are approved.
Date: 2026-06-25.

## Purpose

Replace the reverse-engineered Phase-2 store and dashboard with a forward-looking system.
The system has three jobs: capture training with low friction, track it in a way that shows real progress rather than sparse per-discipline lines, and support a personalized coaching read now that Emilia's external coaching subscription is lapsing.
The organizing principle shifts from disciplines and personal bests to training capacities, with goals as a thin top layer and the capacity work as the dense signal underneath.

## Scope

In scope now: pool (STA, DYN, DYNb, DNF) and dry static capture, the exercise library with in-app authoring, plan-versus-actual, the calendar and volume views, capacity rollups, session-time estimation, and the Dropbox round-trip.
Stubbed but structurally ready: gym (strength and HIIT/SIIT).
Deferred with a slot reserved: day-level metrics (period first, then sleep, weight, HRV, resting HR), and automated device import (Garmin HR, Stamina SpO2).
Out of scope: depth diving, multi-user, anything requiring a backend server.

## Core data model

The spine is session contains exercises contains reps, with the exercise library supplying reusable templates.

### Exercise template (library)

- MUST be authorable and editable in-app, not only seeded from a file. Emilia adds new exercises herself.
- MUST carry: name, environment (pool / dry / gym-later), role (warmup / main / cooldown), capacity tags (multi-valued), goal text, and free cues/notes.
- MUST allow discipline to be unspecified ("any") at the library level only.
- MUST define a `format` (see below) that drives which fields and units appear.
- MUST define a set structure: `set_repeat` K (default 1), an intra-set recovery default, and an inter-set recovery default.
- MUST hold a rep block: an ordered list of planned rep specs (the canonical expansion).
- SHOULD also hold a generator rule (start / step / termination) that expands into the rep block, so PB-relative and contraction-relative tables regenerate when PB or the first-contraction average changes.
- MUST support a termination condition: fixed N, range (e.g. 3-10), until first contraction (1C), until urge-to-breathe (UTB), until failure, until quality drops, or duration-capped (e.g. 20 or 30 minutes).
- For a duration-capped, rep-based exercise (e.g. a 20-minute pyramid), the actual MUST capture completed cycles (fractional allowed, e.g. 2.5) and total distance or laps, rather than requiring every rep be logged individually. A cycle is defined per template (e.g. one full up-and-down pyramid).
- SHOULD allow a template to reference another template (warmups compose onto a session; e.g. WU7 = "session 9"). The template schema MUST include a `references` field from Phase 0 even though resolve-and-expand may ship later, so adding the behavior is not a refactor.
- MAY store a worked example expansion for a reference PB (several library entries already include one).

### Planned exercise (instance in a session)

- MUST have a concrete discipline set at plan time. Discipline is never deferred to the day.
- MUST inherit from a template or be ad-hoc, with the rep block, set_repeat, recoveries, and targets editable after instantiation.
- MUST keep its link back to the source template when instantiated from one, so exact cross-session matching works.

### Rep (leaf), conditional on `format`

A `format` dropdown selects the effort shape and thereby which fields and which contraction unit show.
This is what spares every exercise from re-specifying meters versus mm:ss.

- MUST treat `format`, lung volume, pace, and recovery as rep-level fields, each with an exercise-level default, since reps within one exercise can differ. Test cases: DYN session 1 (104m / 40m / max, each a different target type and recovery), DYN session 18 (an FRC dive then 25m sprints), STA session 16 (constant 2:30 hold with recovery 60/50/40/30/20/10s). Recovery is therefore per-rep, not a single intra-set value.

- `format` options and their captured components, in temporal order:
  - STA: hold only (mm:ss).
  - DYN / DYNb / DNF: distance only (meters).
  - stop-start: static then dynamic (hold, then distance).
  - start-stop: dynamic then static (distance, then hold).
  - stop-in-the-middle: dynamic, static, dynamic (first distance, hold, second distance; two distance segments around one hold).
  - continuous-protocol: a single unbroken block with no discrete reps (e.g. 30-minute square breathing, non-stop hypercapnic swim).
- Static-relevant fields: hold target, lung volume (FL / FRC / RV, where RV = EL), prep breathing, recovery, contractions in seconds.
- Dynamic-relevant fields: distance target, dive time, turns (auto from distance and pool length), lung volume, technique variant (DNF only: legs-only / arms-only / normal / crawl), pace (sprint / max-sprint / relaxed), prep breathing, recovery, contractions in meters, stroke count (DNF technique work).
- Compound formats carry the components in the order above: stop-start and start-stop carry one hold and one distance; stop-in-the-middle carries one hold and two distance segments.
- Common to all: HR high, HR low, SpO2 nadir, an optional incident/near-miss field (none / samba / LMC / BO / other, plus a note), and a rep note.

### Typed targets (the universal pattern)

Holds, distances, and recovery all use the same "typed target plus realized actual" pattern.
Here "typed" means each target carries a type or category chosen from a dropdown, not entered free-hand; the value is picked via buttons or steppers, so keyboard entry is minimal.

- Hold target unit: absolute (mm:ss), % of PB, relative-to-contractions (1C + X), or qualitative (sub-max / strong sub-max / max / close-to-max). The value field's meaning shifts with the unit.
- Distance target unit: absolute (m), % of PB, qualitative ("long but doable", max), or computed (smallest of {A, B}; X% less than previous rep).
- Recovery target type: absolute, cap ("minimum, absolute max 60s"), inequality ("< swim time", "< 2 min"), or qualitative (minimal / adequate / full), plus a unit of time or breaths (RB = recovery breaths).
- The actual is always a realized number: hold and dive time in mm:ss, distance in meters, recovery in its unit.

### Breathing

- MUST capture only `duration` and `pattern` (5:5, 4:6, 2:2, square, and so on). Emilia decodes pattern to intensity in her head.
- MUST keep a stored, editable pattern-to-intensity lookup (5:5 = strong HV, belly and chest; 4:6 = soft HV, belly; 2:2 = very strong; and so on) so the analysis layer can read intensity without Emilia entering it.
- SHOULD support an in-swim breathing cadence for continuous hypercapnic swims (e.g. breathe every 7+ strokes), distinct from prep breathing.

### Plan versus actual

- MUST store `planned` and `actual` separately and never overwrite the plan when the actual is edited. The gap between them is the coaching signal.
- MUST record, per exercise actual: physical RPE and mental RPE (exercise level, not per rep), a deviation reason (completed / ran out of time / stopped early-felt off / equipment / other), and free remarks. There is no separate categorical effort rating; the two RPEs replace it.
- MUST record, per rep actual: realized hold and/or distance, turns, realized recovery, contractions (value plus unit), stroke count where relevant, HR, SpO2, and a note.
- MUST record, per session: session remarks and overall feel.

### Goals

- MUST be settable and editable in-app, one per discipline target. Current goals: 150 m DNF, 6:00 STA, 200 m DYN (monofin).
- MUST drive the top-layer progress gauges (current best versus target).

### Settings

- MUST hold a per-discipline pace (seconds per 25 m) for time estimation. STA has none.
- MUST hold the pool length (default 25 m), used to auto-derive turns from distance.
- MUST hold per-discipline PB values, entered manually in settings, for %PB targets and table expansion.
- MUST provide a quick entry for spirometer lung volume (vital capacity and packed volume, in liters), separate from the day-level metrics record.
- MUST hold the breathing pattern-to-intensity lookup.
- SHOULD hold the rolling first-contraction window settings (per discipline and lung volume).
- MUST allow a hand-entered personal first-contraction baseline (per discipline x lung volume), used while the rolling average has too little history; the UI shows a "no history yet" state and which source the estimate is using until the minimum N is reached.

### Day-level metrics (deferred build, slot reserved now)

- MUST reserve a day-keyed metrics record so adding period, sleep, weight, HRV, and resting HR later is a field addition, not a refactor.
- Period is the first to build, in a later phase, and surfaces as a calendar marker.

### Derived stores

- MUST maintain a first-contraction rolling-average store, keyed by discipline x lung volume, updated whenever a logged rep records a first-contraction time. It feeds session-time estimation and contraction-relative table expansion; the averaging window is a setting, and a template nominal value is the cold-start fallback.
- MUST stamp every stored record with a `schema_version`, so later additions (gym, day-level metrics, device import) are field additions rather than migrations.

## Capacities

Capacity tags are an extensible controlled vocabulary, multi-valued per exercise, sourced from each exercise's goal.

- Shared: CO2 tolerance, O2 / hypoxic efficiency, mental game, volume.
- Static also: lung volume (spirometer: vital capacity and packed volume), entered via its own quick entry.
- Dynamic and gym only: fitness / lactic, technique.
- Capacities are drivers; goals are outcomes (a 6:00 STA is downstream of CO2, O2, and mental work). The coaching narrative may state these links.

## Views

- MUST provide a calendar with a marker on logged days and a ghost outline on planned days, drilling from day to session to exercise to rep (this is the click-through-to-notes requirement).
- MUST provide volume tiles, with at least one replaced by a capacity-trend tile so the top line carries signal rather than only counts.
- MUST provide a plan flow (build a session from library templates, edit numbers, see the estimated duration) and a log flow (fill actuals against the plan).
- MUST provide a library browser with in-app create and edit of templates.
- MUST provide a goals view with edit.
- SHOULD provide capacity panels (the dense differentiator).
- SHOULD provide a coaching narrative grounded in specific, clickable sessions. Initial generation is by Claude from the exported JSON; in-app generation is a later option (see open questions).

## Session-time estimation

- MUST estimate planned exercise and session duration from the per-discipline pace, the planned holds and distances, and the planned recoveries, summed across reps and sets plus warmup and transitions, and surface it on the plan and calendar.
- MUST resolve relative-to-contraction holds (1C + X) using a rolling average of recent first-contraction times, segmented per discipline and lung volume. Cold-start order: the user's hand-entered baseline if set, else the template nominal, until the rolling average has enough history; the estimate surfaces which source it used.
- The deviation-reason field pairs with this so a session cut short by pool time never reads as a capacity shortfall.

## Technology and round-trip

- MUST be a PWA, installable to the Android home screen, working offline via a service worker and IndexedDB as the local source of truth.
- MUST request persistent storage (navigator.storage.persist()) and surface storage state, since IndexedDB can be evicted under storage pressure on mobile and the Dropbox export is the only backup of record.
- MUST auto-upload the session JSON to Dropbox via the Dropbox API using the OAuth2 PKCE flow for a public client (no client secret) with a persisted refresh token, since Dropbox access tokens expire in about 4 hours. A manual "share to Dropbox" is the fallback. The app auto-exports after each logged session so an un-exported session is never lost to eviction. Emilia has approved registering a Dropbox app (App-folder scoped access).
- MUST handle token expiry: catch a 401 expired_access_token, refresh the access token with the stored refresh token, and retry the request.
- MUST drain pending uploads from a local outbox queue on reconnect (Background Sync where available, foreground fallback) and surface an indicator of any sessions not yet backed up.
- MUST version exports (timestamped filenames or Dropbox file revisions, keeping the last N) so a faulty or empty export never overwrites the last good copy.
- MUST provide a restore path that rehydrates IndexedDB from the latest good Dropbox export, since a backup that cannot be restored is not a backup.
- Accepts local storage of the Dropbox refresh token: App-folder scope contains the blast radius to this app's own folder on a personal device, so a passphrase or token broker is not warranted.
- MUST expose export and restore behind one adapter interface with two implementations, Dropbox and local-file, so work proceeds if Dropbox setup stalls.
- MUST define the outbox record contract: a stable item id and idempotency key, a retry schedule, duplicate detection, and a terminal-error state surfaced to the user.
- MUST pin routing: the GitHub Pages base path, the OAuth callback path, and the session deep-link URL pattern, so coaching citations resolve.
- MUST handle a named set of data-loss scenarios (eviction, quota pressure, dirty form during a service-worker update, corrupt restore, migration failure, duplicate-export import, accidental template mutation), verified as a data-safety matrix before capture ships.
- MUST host the PWA on a stable HTTPS origin (GitHub Pages) whose exact redirect URI is registered with the Dropbox app.
- The JSON lands in a Dropbox folder that syncs to the working PC, where Claude reads it to build analysis, capacity rollups, and the coaching narrative.
- MUST keep data local and private; no third-party analytics.

## Analysis layer (Claude, from the export)

- Match each logged exercise to its historical siblings: exact via the template link, fuzzy for ad-hoc exercises.
- Extract within-set structure (dive times versus surface intervals across a CO2 table; SpO2 nadir progression across an O2 ladder; recovery creep at constant hold).
- Read physical versus mental RPE against the realized numbers.
- Roll exercises into capacities via their tags, reading breathing intensity through the stored pattern-to-intensity lookup (e.g. soft HV before a CO2 table), track PBs against goals, maintain the rolling first-contraction average, and write a grounded coaching narrative.
- Light parsing of free-text notes remains; the bulk of the work is analysis, not parsing.
- Coaching contract: the read is produced from the latest export, which carries stable session ids; every citation deep-links to its session, so the prose is always traceable.

## Non-goals and deferrals

- Gym leaf types (strength: weight x reps x RIR; interval: work/rest time) are stubbed now and finalized when Emilia sends a gym example. The set-by-rep backbone already fits gym, so this is a leaf addition.
- Day-level metrics (period and the rest) are built later against the reserved slot.
- Garmin HR and Stamina SpO2 enter manually now; automated import and reconciliation are a later phase.
- The existing Phase-2 SQLite store and static dashboard are not deleted; their capacity definitions and aggregation logic inform this build, and past extractions remain a read-only archive.

## Resolved decisions (from review)

- PB is manual in settings (no auto-derivation).
- Lung volume is its own quick entry, not a day-level metric.
- Compound format component order: stop-start = static then dynamic; start-stop = dynamic then static; stop-in-the-middle = dynamic, static, dynamic (two distance segments around one hold).
- Coaching narrative: Claude writes it from the Dropbox export to start; in-app API generation is a later option.
- Continuous-protocol leaf: total duration, pattern or cadence, and an optional count are enough. Duration-capped rep-based exercises additionally capture completed cycles (fractional) and total distance/laps.

## Adjustments from the fresh-eyes plan review

- Categorical effort rating dropped; physical and mental RPE (exercise level) are the only effort fields.
- `format`, lung volume, pace, and recovery are rep-level with exercise-level defaults; recovery is per-rep.
- Termination types extended with "until first contraction" and "until UTB".
- A first-contraction rolling-average store (discipline x lung volume) and a `schema_version` on every record are part of the Phase-0 schema.
- A `references` field on templates and a pool-length setting are added.
- Dropbox auth uses the OAuth2 PKCE public-client flow with a persisted refresh token; the app requests persistent storage and auto-exports after each session.

## Adjustments from the independent (fourth) review

- Schema and library split: a minimal schema plus ~6 canonical fixture templates first, the full ~40-exercise import after the capture slice is validated.
- A data-safety matrix of named data-loss scenarios is verified before capture ships, with restore drills recurring thereafter.
- Export/restore sit behind one adapter with Dropbox and local-file implementations, so the external Dropbox gate never blocks app work.
- The outbox has a defined record contract (id, idempotency key, retry, duplicate detection, terminal-error state); routing (base path, callback, deep-link) is pinned.
- Local refresh-token storage risk is accepted (App-folder scope contains it).
- An optional incident/near-miss field (samba / LMC / BO / other) is added; no buddy field and no coaching safety boundary, by Emilia's choice.
- The capacity vocabulary is locked early so Phase 2 can tag and Phase 4 can roll up.
