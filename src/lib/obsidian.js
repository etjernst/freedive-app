import {
  repSegments,
  describeHold,
  describeDistance,
  describeRecovery,
} from './session.js'
import { estimateSession, fmtDuration } from './estimate.js'

// Export a planned session to Obsidian as a daily training-log note, matching
// the vault's existing format (frontmatter + a section per discipline). Hands off
// via the obsidian://new URL scheme, which works on desktop and Android without
// any filesystem access.

const VAULT = 'EmiliaNotes'

// One planned rep as a single line: its phases joined, then the recovery that
// follows. The trailing recovery of a single-set exercise is dropped (it leads
// nowhere), mirroring the builder.
function repLine(rep, ex, isLast) {
  const segs = repSegments(rep.shape ?? 'simple', ex.discipline)
  const parts = []
  for (const seg of segs) {
    if (seg === 'hold') parts.push(describeHold(rep.hold_target))
    else if (seg === 'distance') parts.push(describeDistance(rep.distance_target))
    else if (seg === 'distance2') parts.push(describeDistance(rep.distance2_target))
    else if (seg === 'continuous') parts.push(rep.continuous?.pattern || 'continuous')
  }
  let line = parts.filter(Boolean).join(' → ') || '—'
  const showRec = rep.recovery && !((ex.set_repeat ?? 1) <= 1 && isLast)
  if (showRec) {
    const r = describeRecovery(rep.recovery)
    if (r && r !== '—') line += ` · rec ${r}`
  }
  return line
}

function exerciseBlock(ex) {
  const reps = ex.planned?.reps ?? []
  const sets = ex.set_repeat ?? 1
  const head = `### ${ex.name}${sets > 1 ? ` (×${sets} sets)` : ''}`
  const lines = reps.map((rep, i) => `- ${repLine(rep, ex, i === reps.length - 1)}`)
  const out = [head, ...lines]
  if (ex.plan_note?.trim()) out.push(`Notes: ${ex.plan_note.trim()}`)
  return out.join('\n')
}

export function sessionToMarkdown(session, settings) {
  const exercises = session.exercises ?? []
  const disciplines = [...new Set(exercises.map((e) => e.discipline))]
  const allDryStatic =
    exercises.length > 0 && exercises.every((e) => e.discipline === 'STA' && e.medium === 'dry')
  const environment = allDryStatic ? 'dry' : 'pool'

  const front = [
    '---',
    'type: training',
    `date: ${session.date}`,
    `environment: ${environment}`,
    `disciplines: [${disciplines.join(', ')}]`,
    'source: winnow',
    '---',
    '[[Freediving]]',
    '',
  ]

  const body = []
  for (const disc of disciplines) {
    body.push(`## ${disc}`, '')
    for (const ex of exercises.filter((e) => e.discipline === disc)) {
      body.push(exerciseBlock(ex), '')
    }
  }

  if (session.session_remarks?.trim()) {
    body.push(`Session notes: ${session.session_remarks.trim()}`, '')
  }
  const est = estimateSession(session, settings)
  if (est.seconds) {
    body.push(`_Estimated: ${fmtDuration(est.seconds)}${est.uncertain ? ' + unestimated' : ''}_`)
  }

  return {
    filename: `Training log ${session.date}`,
    content: front.concat(body).join('\n'),
  }
}

// No overwrite/append: if a note for the day already exists, Obsidian creates a
// safely numbered copy rather than clobbering it.
export function openInObsidian(session, settings) {
  const { filename, content } = sessionToMarkdown(session, settings)
  const uri =
    `obsidian://new?vault=${encodeURIComponent(VAULT)}` +
    `&file=${encodeURIComponent(filename)}` +
    `&content=${encodeURIComponent(content)}`
  window.location.href = uri
}
