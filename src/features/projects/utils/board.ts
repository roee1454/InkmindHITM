import type { PipelineProject, ProjectStage } from '../types'
import { formatQuote, formatShortSlot } from './format'
import { LOST_REASON_LABELS } from './labels'
import { daysInStage } from './pipeline'

export type BoardColumnId = 'inquiry' | 'consultation' | 'quoted' | 'booked' | 'in_progress' | 'completed' | 'lost'

export interface BoardColumn {
  id: BoardColumnId
  label: string
  stages: ProjectStage[]
}

/**
 * The projects board's columns, left to right through the funnel (track-b B6.10). Eight stages is
 * too wide to scan, so the two consultation stages share a column — the card itself says which.
 */
export const OPEN_COLUMNS: BoardColumn[] = [
  { id: 'inquiry', label: 'פנייה', stages: ['inquiry'] },
  { id: 'consultation', label: 'ייעוץ', stages: ['consultation_scheduled', 'consultation_done'] },
  { id: 'quoted', label: 'הצעת מחיר', stages: ['quoted'] },
  { id: 'booked', label: 'נקבע', stages: ['booked'] },
  { id: 'in_progress', label: 'בעבודה', stages: ['in_progress'] },
]

/** Finished work sits behind a toggle: it's history, not the pipeline. */
export const CLOSED_COLUMNS: BoardColumn[] = [
  { id: 'completed', label: 'הושלמו', stages: ['completed'] },
  { id: 'lost', label: 'אבודים', stages: ['lost'] },
]

export function groupByColumn(projects: PipelineProject[], columns: BoardColumn[]): Map<BoardColumnId, PipelineProject[]> {
  const grouped = new Map<BoardColumnId, PipelineProject[]>(columns.map((c) => [c.id, []]))
  for (const project of projects) {
    const column = columns.find((c) => c.stages.includes(project.stage))
    if (column) grouped.get(column.id)!.push(project)
  }
  return grouped
}

/** Why a card carries the attention dot. Money outranks a stall, as on the calendar. */
export type ProjectAttention = 'owes' | 'stuck'

export const ATTENTION_LABELS: Record<ProjectAttention, string> = {
  owes: 'יתרה פתוחה',
  stuck: 'לא זז כבר זמן מה',
}

/** Days a project may sit in a waiting stage before someone should nudge it. */
const STUCK_AFTER_DAYS: Partial<Record<ProjectStage, number>> = {
  inquiry: 3,
  quoted: 3,
  consultation_done: 7,
}

/** Healing between sessions is weeks long; past this with nothing booked, the work has stalled. */
const IDLE_BETWEEN_SESSIONS_DAYS = 30

/**
 * Whether a project needs a human, and why (track-b B6.10). The rule differs by stage because
 * "waiting" means different things: an inquiry three days old has gone cold, while a project
 * mid-work is fine for weeks of healing as long as the next session is — or soon will be — booked.
 */
export function projectAttention(project: PipelineProject, now: Date): ProjectAttention | null {
  if (project.stage === 'lost') return null
  if (project.due > 0) return 'owes'
  if (project.stage === 'completed') return null

  const threshold = STUCK_AFTER_DAYS[project.stage]
  if (threshold !== undefined) {
    const days = daysInStage(project.stageChangedAt, now)
    return days !== null && days >= threshold && !project.nextAppointmentAt ? 'stuck' : null
  }

  // Scheduled consultation, booked session, work in progress: fine while something is booked.
  if (project.nextAppointmentAt) return null
  if (project.stage === 'in_progress') {
    const idle = daysInStage(project.lastSessionAt, now)
    return idle !== null && idle >= IDLE_BETWEEN_SESSIONS_DAYS ? 'stuck' : null
  }
  // A consultation or a session was booked, its time passed, and nobody closed it.
  return 'stuck'
}

const ATTENTION_RANK: Record<ProjectAttention, number> = { owes: 0, stuck: 1 }

/** Within a column, what needs a human rises to the top; everything else keeps its order. */
export function sortForColumn(projects: PipelineProject[], now: Date): PipelineProject[] {
  const rank = (p: PipelineProject) => {
    const attention = projectAttention(p, now)
    return attention ? ATTENTION_RANK[attention] : 2
  }
  return projects
    .map((project, index) => ({ project, index, rank: rank(project) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.project)
}

function sinceLabel(days: number | null): string {
  if (days === null) return ''
  if (days === 0) return 'היום'
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}

function sessionsLabel(count: number): string {
  return count === 1 ? 'סשן אחד' : `${count} סשנים`
}

/** The one line a card shows under the customer: the fact that matters most at this stage. */
export function projectCardFact(project: PipelineProject, now: Date): string {
  const since = sinceLabel(daysInStage(project.stageChangedAt, now))
  const next = project.nextAppointmentAt ? formatShortSlot(project.nextAppointmentAt) : ''

  switch (project.stage) {
    case 'inquiry':
      return since ? `פנייה ${since}` : 'פנייה חדשה'
    case 'consultation_scheduled':
      return next ? `ייעוץ ${next}` : 'ייעוץ שעבר ולא נסגר'
    case 'consultation_done':
      return since ? `ייעוץ בוצע ${since}` : 'ייעוץ בוצע'
    case 'quoted':
      return [formatQuote(project.quoteMin, project.quoteMax), since && `נשלחה ${since}`].filter(Boolean).join(' · ') || 'נשלחה הצעת מחיר'
    case 'booked':
      return next ? `סשן ${next}` : 'סשן שעבר ולא נסגר'
    case 'in_progress': {
      const progress = project.estimatedSessions
        ? `${project.sessionsDone} מתוך ~${project.estimatedSessions} סשנים`
        : `${sessionsLabel(project.sessionsDone)} עד עכשיו`
      return next ? `${progress} · הבא ${next}` : progress
    }
    case 'completed':
      return project.sessionsDone ? `הושלם · ${sessionsLabel(project.sessionsDone)}` : 'הושלם'
    case 'lost':
      return project.lostReason ? `אבוד · ${LOST_REASON_LABELS[project.lostReason]}` : 'אבוד'
  }
}
