# Spec: in-app plan overview + frictionless post-dive capture

## Why

Emilia is retiring the Obsidian -> SQLite parsing pipeline; the app's IndexedDB
record becomes the single source of truth. The only reasons she still reaches for
the Obsidian export are two in-app frictions, not a need for Obsidian itself:

1. Reading the plan in the app requires scrolling through a long editable form;
   there is no one-screen, glanceable view of the whole plan.
2. Capturing post-dive thoughts (session-level free text) means scrolling to the
   bottom of the log view, so she dictates into Obsidian instead and re-copies.

Goal: make both painless inside the app so Obsidian becomes optional, not
load-bearing. The Obsidian export stays as a one-way "publish a readable copy";
this spec does not change it.

Scope note: this is a UI change to the log and build views plus possibly tiny,
additive model touches. No change to the session schema's meaning, to estimation,
or to how actuals are stored.

## MUST

- M1. A compact, read-only plan overview, rendered in-app, that shows the whole
  session plan on roughly one screen without scrolling through editable fields:
  per exercise, its name (and x sets when set_repeat > 1), each planned rep as a
  single line (hold/distance target, lung volume when not full lung, pace when
  set, recovery), and the plan_note. Reuses the existing describe* helpers and the
  repLine logic already in obsidian.js so the overview and the export agree.
  [CLEAR]
- M2. The overview is reachable from the log view (session-log) without leaving
  it, so she can glance at the plan poolside while logging. [CLEAR]
- M3. A prominent, always-reachable session-level free-text capture field in the
  log view that does NOT require scrolling to the bottom, suitable for dictating
  post-dive thoughts (the phone OS mic already works in any textarea; the fix is
  reachability, not a new input mechanism). It binds to the existing
  session_remarks so nothing new is stored. [CLEAR]
- M4. No regression: existing log entry, save, "Edit plan", and the per-rep
  fields keep working; the saved session document is unchanged in shape. [CLEAR]

## SHOULD

- S1. The overview is collapsible and defaults to a sensible state (collapsed once
  there are several exercises, so it does not itself become a scroll burden).
  [CLEAR]
- S2. The overview also appears in the build view (session-build) as a read-back
  of what was assembled, since the same glance-the-plan need exists there.
  [NEEDS CONFIRMATION: build view already shows editable plan; a read-only mirror
  may be redundant there. Default: log view only unless you want it in both.]
- S3. The per-rep note field is reachable without opening "More", or at least the
  capture friction for a single rep thought is reduced. [CLEAR]
- S4. The overview marks which exercises are already logged vs still empty, so
  poolside she can see what is left to do. [CLEAR]

## MAY

- A1. A one-tap "focus the thoughts field" affordance (e.g. a sticky button) that
  scrolls to / focuses the session capture field for immediate dictation. [CLEAR]
- A2. Show the session time estimate in the overview header (reuse
  estimateSession), matching the export footer. [CLEAR]
- A3. Render the overview as the same Markdown-ish layout as the Obsidian export
  for visual consistency. [CLEAR]

## Out of scope

- Changing the Obsidian export (content, placement, or the numbered-duplicate
  behavior). Separate decision, deferred.
- Any change to the session schema's meaning, estimation logic, or actual storage.
- The set_repeat vs termination.n planned-count ambiguity and the missing
  lung_volume/pace on logged reps (data-model issues from the 2026-06-28 review);
  tracked separately, not part of this capture/overview work.

## Acceptance

- In the log view for a planned or part-logged session, the plan is visible at a
  glance in a read-only block without scrolling the editable form.
- A session-level thoughts field is reachable and dictatable without scrolling to
  the bottom; what is typed/dictated persists to session_remarks on save.
- npm run build succeeds; no console errors; saved session JSON shape is unchanged.
