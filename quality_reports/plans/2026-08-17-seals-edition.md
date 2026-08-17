# Plan: Seals edition of Winnow

Approved in chat 2026-08-17 ("we should just go ahead with the build").
Design source: [docs/seals-basic-program.md](file:///C:/git/freedive-app/docs/seals-basic-program.md).

## Must

- One `build_library.py` for both editions. Seals exercises are their own catalog entries (ids `seals-*`, discipline DYNb except tortuga), with `collections: ["seals"]`, `phase_tags`, and `phase_defaults` keyed by phase (`base`, `build`, `specialization`, `taper`), each entry giving `reps` and optional `set_repeat` and `recovery_inter`. `python seed/build_library.py` writes `seed/fixtures.json` (canon, no seals) and `seed/fixtures.seals.json` (seals only); the schema gains the three fields and `validate.py` checks both files.
- Edition switch at build time: `VITE_EDITION=seals` selects the seals fixtures (Vite alias), base path `/winnow-seals/`, manifest name and app title "Winnow Seals", and IndexedDB name `winnow-seals` (same GitHub Pages origin as the full app, so the DB name is what keeps the two apart).
- Phase chip row in the library filters, shown only when the loaded library has phase tags; adding an exercise with a phase selected applies that phase's defaults to the new exercise's planned reps.
- Template student profile in settings (DYNb PB 100 m, cruise 25 s per 25 m, sprint 17.5 s per 25 m, surface swim 30 s per 25 m, breath 10 s, pool 25 m) and an "Estimate for: me / template student" toggle in the session builder that switches which profile the estimate uses. Editable in Settings.
- Seals edition hides Dropbox and Obsidian sync controls and the tagline says the club, not "coaching".

## Should

- A second-repo deploy workflow prepared in this repo (checkout this repo, build with the flag, deploy Pages); creating the repo and pushing is asked for separately.
- Full edition unaffected: same fixtures, same DB, same UI when no phase tags are present.

## May

- Demo sessions in Insights suppressed for the seals edition.

## Order

1. Library and schema (main thread): catalog entries, fields, edition flag, validate.
2. App plumbing, filter, phase defaults, template student, tidy (sonnet subagent, one brief, sequential edits).
3. Build both editions locally, open the seals build, check the ten exercises, the phase chips, and the estimate.
4. Deploy workflow file; ask before creating the repo.
