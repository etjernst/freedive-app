# Plan: freedive capture, tracking, and coaching app

Status: approved, building.
Spec: [2026-06-25-freedive-capture-app.md](file:///C:/git/freedive-app/quality_reports/specs/2026-06-25-freedive-capture-app.md).
Mode: Implementation.
Date: 2026-06-25.

Copied into the freedive-app repo on 2026-06-28 so the plan and spec travel with the code.
The original lives in the freedive repo; the broader data-system roadmap (SQLite store, dashboard, Garmin parsing) stays there.

## Status as of 2026-06-28

Done: Phase 0a (schema, vocabulary, first-contraction formula), Phase 1 (PWA shell, IndexedDB, persistence, export/restore, Dropbox, settings, GitHub Pages), Phase 2a (capture core: build/log, plan-vs-actual, RPE, deviation, incident).

Delivered since: Phase 0b (full library rebuilt to 44 templates from the STA and DYN notes via `seed/build_library.py`) and most of Phase 2b (typed targets, time estimation including 1C+X resolution, duration-capped).
Also built beyond the plan: an Insights view (wet/dry and warm-up comparisons), a reuse-from-history picker, and a quick-log path for plan-less backfilling.

Open loose ends on delivered phases: the Phase 0b nested-set decision (DYN 2/17/18 heterogeneous blocks vs a recursive group node) is unresolved; Phase 2b still wants in-app duplicate-and-tweak, one-tap promote-logged-to-template, and a check that the compound/generator exercises log correctly.

Pending phases: Phase 3 (calendar, volume tiles, drill-through, spirometer trend), Phase 4 (capacity rollups and panels, exercise matching, coaching read), Phase 5 (deferred: in-app builder, gym leaf, day-level metrics, Garmin/SpO2 import).
Smaller items are in [TODO.md](file:///C:/git/freedive-app/TODO.md).

The spec is the single source of truth for requirements (the what and why).
This plan covers the how and the order, and references the spec rather than restating it.
The traceability table below maps every spec requirement group to the phase that delivers it, so nothing floats unbuilt.

## Approach

Build a PWA as a thin vertical slice first, then widen.
Get a minimal schema and a handful of fixture templates in, stand up the app shell with durable storage and export/restore, prove the capture loop end to end on the fixtures, and only then import the full library and add capture richness.
This stops schema-perfectionism from arriving before usability feedback.
Gym and day-level metrics stay stubbed against reserved slots throughout.

Execution order: 0a, 1, 2a, 0b, 2b, 3, 4, then the deferred Phase 5.
The phases below are listed in that order.

## Autonomy and check-ins

Each phase states a single, checkable "Done when" criterion; run autonomously to it, pausing only when a genuine ambiguity blocks progress.
Phase 0a and Phase 1 run with brief status notes, except the one human prerequisite in Phase 1: Emilia registers the Dropbox app (App-folder access, redirect URI, scopes) and supplies the app key.
Phase 2a is the first hands-on review gate, on fixtures.
Phase 2b is the second gate.
Phases 3 and 4 each end in a check-in.
Restore drills (restore from old-schema, corrupt, partial, and conflicting exports) run as an acceptance check at the end of every phase from Phase 1 on.

## Adding exercises to the library

1. Seed by markdown: ~6 canonical fixtures in Phase 0a, the full ~40 in Phase 0b. The parser stays available for authoring a complex new exercise later (write shorthand, drop in Dropbox, Claude structures it).
2. Everyday add in-app by duplicate-and-tweak (Phase 2b), plus one-tap promote-logged-exercise-to-template.
3. Full structured in-app builder with a generator-rule editor (Phase 5, deferred).

## Requirement to phase traceability

| Spec requirement group | Phase |
|---|---|
| Data model (session/exercise/rep, rep-level fields, typed targets, sets x reps, `schema_version`, `references`) | 0a |
| First-contraction store + formula; capacity vocabulary | 0a |
| Full library import; nested-set representation decision | 0b |
| PWA shell, service worker, IndexedDB, persistent storage | 1 |
| Dropbox PKCE auth + refresh path; local-file export adapter; outbox contract; versioned exports; restore | 1 |
| Routing (base path, callback, deep-link); migrate-on-read stub | 1 |
| Data-safety matrix | 1 |
| Settings (PB, pace, pool length, breathing lookup, spirometer, 1C baseline) | 1 |
| Capture core: build/log/export, format leaf, plan-vs-actual, RPE, deviation reason, incident field | 2a |
| Capture richness: typed targets, time estimation + 1C resolution, duration-capped, library growth | 2b |
| Calendar, volume tiles, drill-through, spirometer trend | 3 |
| Capacity rollups + panels, exercise matching, coaching read + contract | 4 |
| In-app builder, gym leaf, day-level metrics, device import | 5 (deferred) |

## Phase 0a: minimal schema and fixtures

Goal: just enough schema and templates to build the capture slice on.
Done when: the schema covers the core entities and rep-level fields; ~6 canonical fixture templates (e.g. NWU sub-max, a CO2 table, an O2 table, an EL/RV set, a DNF pyramid, a stop-start) self-validate; the capacity vocabulary and the first-contraction formula are defined.

- Write the core JSON schema (templates, planned/logged sessions, reps, goals, settings, day-level-metrics slot, first-contraction store), with rep-level `format`/lung-volume/pace/recovery, typed targets, `schema_version`, and a `references` field.
- Lock the capacity vocabulary (CO2, O2/hypoxia, mental, volume, lung volume, and fitness-lactic + technique for dynamic).
- Define the first-contraction rolling-average formula (window per discipline x lung volume, weighting, minimum N before trusted over the hand-entered baseline or template nominal).
- Hand-author ~6 fixture templates spanning the format and target variety.

## Phase 1: app skeleton, storage, and sync

Goal: an installable PWA with durable storage and a working export/restore round-trip.
Done when: the app installs on Android, loads offline, shows the fixtures and settings; an export lands via the chosen adapter and restores back into a cleared IndexedDB; the Dropbox path works including one upload after the access token has expired; the data-safety matrix passes.
Human prerequisite (gates the Dropbox spike): Emilia registers the Dropbox app and supplies the app key, redirect URI, and scopes.

- Step zero: deploy an empty page to the GitHub Pages origin so OAuth is tested against the real origin, not localhost. Pin routing here (base path, OAuth callback, deep-link URL pattern).
- Export/restore behind one adapter interface with two implementations: local-file (works immediately, unblocks everything) and Dropbox.
- Dropbox spike: OAuth2 PKCE public client, `token_access_type=offline`, scopes, exact redirect URI; assert a refresh_token is returned; catch 401 expired_access_token, refresh, retry; verify after expiry.
- Define and implement the outbox contract (item id, idempotency key, retry schedule, duplicate detection, terminal-error state) and versioned exports (keep last N).
- Scaffold the PWA: service worker (skip-waiting plus an update banner, never reload a dirty form), IndexedDB with navigator.storage.persist(), home-screen install.
- Data layer for all entities, a migrate-on-read stub keyed off `schema_version`, import of the 0a fixtures.
- Settings: PB, pace, pool length, breathing pattern-to-intensity lookup, spirometer quick entry (liters), hand-entered 1C baseline.
- Data-safety matrix: name and test each scenario (eviction, quota pressure, dirty form during update, corrupt restore, migration failure, duplicate-export import, accidental template mutation) with expected behavior.

## Phase 2a: capture core (on fixtures)

Goal: build, log, and export a basic session end to end.
Done when: a fixed-rep session built from the fixtures can be trained, logged with plan and actual both preserved without overwriting, and exported; plan-vs-actual round-trips. First hands-on review gate.

- Build a session: date, add exercises, concrete discipline per exercise, edit numbers, reorder.
- Format-driven rep leaf (static / dynamic / the three compound formats / continuous-protocol).
- Plan stored as a snapshot; logging the actual writes alongside without overwriting.
- Per-exercise physical and mental RPE, deviation reason, remarks; per-rep actuals incl. the incident/near-miss field; per-session remarks and overall feel.

## Phase 0b: full library import

Goal: the complete library, now that the capture UX is validated.
Done when: all sessions plus warmups and cool-downs map to templates or are logged as documented exceptions (target <= 3); the nested-set question (does `set_repeat` plus a heterogeneous rep block suffice for DYN 2, 17, 18, or is a recursive group node needed) is resolved here; Emilia signs off a sample.

- Parse the STA library (21 sessions + 7 warmups) and the DYN library (18 sessions + cool-downs), surfacing ambiguities.
- Tabulate every source against the leaf and set types; keep exceptions small.

## Phase 2b: capture richness

Goal: the full capture loop with typed targets, estimation, and library growth.
Done when: typed targets work across holds/distances/recovery; time estimation resolves 1C+X holds (cold-start order: hand-entered baseline, then template nominal, then the rolling average); duration-capped logging records fractional cycles plus total distance; duplicate-and-tweak and promote-logged-to-template work; the compound and generator-driven exercises (DYN 1, 2, 18 and STA 16) log correctly. Second hands-on gate.

## Phase 3: calendar and volume views

Goal: the tracking and navigation layer.
Done when: the calendar shows logged days and ghost-outlined planned days; every level drills day to session to exercise to rep; the spirometer quick entry records and trends.

- Calendar with markers and ghost planned days; drill-through.
- Volume tiles; the capacity-trend tile shows a placeholder until Phase 4.
- Lung-volume quick entry surfaced and trended.

## Phase 4: capacities and coaching read

Goal: the differentiator.
Done when (checkable): capacity panels reflect logged work; exercise matching links instances of the same template across time; every citation in a generated coaching read resolves to a real logged session (the hard floor: no claim without a resolvable session link). Separately, Emilia reviews the coaching prose for quality, a judgment rather than a pass/fail gate.

- Capacity rollups from tags, reading breathing intensity via the pattern-to-intensity lookup; capacity panels.
- Exercise matching: exact via template link, fuzzy for ad-hoc; within-set extraction; RPE-versus-numbers reads.
- Coaching narrative by Claude from the latest export, per the coaching contract (stable session ids, citations deep-link to sessions).

## Phase 5: deferred (stubs ready)

- Full in-app structured template builder with a generator-rule editor.
- Gym leaf types (strength: weight x reps x RIR; interval: work/rest), on the existing set-by-rep backbone.
- Day-level metrics, period first, against the reserved slot, as a calendar marker.
- Automated device import (Garmin HR, Stamina SpO2) and reconciliation.

## Cross-cutting

- Tech: PWA hosted on GitHub Pages (static HTTPS origin; all logic client-side, no backend), IndexedDB, service worker, Dropbox API plus a local-file fallback.
- Quality: each phase verified before the next. For app code the gate is a per-phase manual acceptance checklist (the "Done when" met, no console errors on the Android install, the data-safety and restore drills pass).
- The Phase-2 SQLite store and dashboard are not deleted; past extractions stay a read-only archive and inform capacity definitions. Historical sessions are not imported into the app; the calendar and volume views start from forward capture.

## Open coordination points

- Gym example from Emilia finalizes the Phase-5 gym leaf; not blocking.
- The Dropbox app registration (Phase 1 prerequisite) is Emilia's step; Claude supplies the exact click-path at that point.
