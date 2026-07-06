// Fabricated 2024 sessions for previewing the per-exercise insight cards on
// exercises that have little or no real logged history yet. Dated in 2024 and
// used ONLY when Insights runs in demo mode (?demo=1), never merged into the
// real session store, so nothing here reaches IndexedDB, the calendar, weekly
// volume, or a Dropbox backup. Numbers are plausible placeholders for eyeballing
// layout and progression, not real training data.

// One logged session carrying a single exercise whose reps are the given hold
// times (seconds). Minimal shape: exerciseRepHistory reads only date,
// template_id, and each rep's hold_s.
function demoSession(date, templateId, name, holds) {
  return {
    id: `demo-${templateId}-${date}`,
    date,
    status: 'logged',
    exercises: [
      {
        id: `demo-ex-${templateId}-${date}`,
        template_id: templateId,
        name,
        discipline: 'STA',
        actual: { reps: holds.map((hold_s) => ({ hold_s })) },
      },
    ],
  }
}

// 1-breath CO2 ladder: reps completed is the headline (ladder length). Holds
// stay near a 1C+X target while the number of reps climbs across sessions.
const oneBreath = [
  ['2024-02-04', [45, 58, 52, 63, 48, 40]],
  ['2024-03-11', [50, 62, 55, 68, 52, 47, 38]],
  ['2024-04-15', [52, 65, 60, 70, 58, 50, 44, 36]],
  ['2024-05-20', [55, 68, 63, 72, 60, 54, 48, 42, 34]],
].map(([d, h]) => demoSession(d, 'sta-co2-1breath', '1-breath CO2 ladder', h))

// Short & intense CO2: total time is the headline. A brutal table, so the rep
// count often falls short of intended; more reps survived reads as more total.
const shortIntense = [
  ['2024-02-06', [82, 74, 88, 70, 60]],
  ['2024-03-13', [85, 78, 90, 72, 64, 55]],
  ['2024-04-17', [88, 80, 92, 76, 68, 60]],
  ['2024-05-22', [90, 84, 95, 80, 72, 64, 56]],
].map(([d, h]) => demoSession(d, 'sta-co2-short-intense', 'Short & intense CO2', h))

// Medium & moderate CO2 (decreasing recovery): fixed reps as recovery shrinks,
// so total time under hold is the headline; completing more of the set lifts it.
const decreasingRec = [
  ['2024-02-08', [120, 120, 118, 118, 115, 110]],
  ['2024-03-15', [122, 120, 120, 118, 116, 114, 108]],
  ['2024-04-19', [122, 122, 120, 120, 118, 116, 112, 108]],
  ['2024-05-24', [125, 124, 122, 122, 120, 118, 115, 112]],
].map(([d, h]) => demoSession(d, 'sta-co2-decreasing-rec', 'Medium & moderate CO2', h))

// V-shaped CO2 table: holds dip then rise within a session; total time climbs
// across sessions. Included so the demo previews all four rep-dot cards together.
const vshape = [
  ['2024-02-10', [150, 120, 100, 90, 100, 120, 150]],
  ['2024-03-17', [155, 125, 105, 95, 105, 125, 155]],
  ['2024-04-21', [160, 130, 110, 100, 110, 130, 160]],
  ['2024-05-26', [162, 132, 112, 100, 112, 132, 162]],
].map(([d, h]) => demoSession(d, 'sta-co2-vshape', 'CO2 table, V-shaped', h))

export const demoSessions = [...oneBreath, ...shortIntense, ...decreasingRec, ...vshape]
