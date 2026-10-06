import { toYmd } from '@/lib/date-utils'
import { formatIls } from '@/features/payments/utils/labels'
import { attentionLabel } from '@/features/conversations/utils/labels'
import { OPEN_COLUMNS, groupByColumn, projectAttention, projectCardFact } from '@/features/projects/utils/board'
import type { ProjectAttention } from '@/features/projects/utils/board'
import type { UIConversation } from '@/features/conversations/types'
import type { PipelineData, PipelineProject } from '@/features/projects/types'
import type { ApiAppointment } from '@/features/calendar/types'

/**
 * The home screen's selections (docs/screens-redesign.md, H). Each reads the same data, and the
 * same rule, as the screen it points to — the inbox, the projects board, the calendar — so the
 * home screen can't count differently from the place a click takes you.
 */

export interface WaitingConversation {
  id: string
  name: string
  reason: string
  lastMessageAt: string | null
}

/** Conversations waiting on a person, as the inbox's "waiting" filter shows them. */
export function waitingConversations(conversations: UIConversation[]): WaitingConversation[] {
  return conversations.flatMap((c) => {
    const reason = attentionLabel(c)
    return reason ? [{ id: c.id, name: c.customerName || c.customerPhone || 'לקוח ללא שם', reason, lastMessageAt: c.lastMessageAt }] : []
  })
}

export interface ProjectNeed {
  project: PipelineProject
  attention: ProjectAttention
  /** What's wrong, in the board card's words: "יתרה ₪800", "סשן שעבר ולא נסגר". */
  fact: string
}

/** Projects the board marks with its attention dot; money before a stall, as on the board. */
export function projectsNeedingAttention(projects: PipelineProject[], now: Date): ProjectNeed[] {
  const needs = projects.flatMap((project) => {
    const attention = projectAttention(project, now)
    if (!attention) return []
    const fact = attention === 'owes' ? `יתרה ${formatIls(project.due)}` : projectCardFact(project, now)
    return [{ project, attention, fact }]
  })
  return needs.sort((a, b) => (a.attention === b.attention ? 0 : a.attention === 'owes' ? -1 : 1))
}

export interface HomeViewer {
  id: string
  isAdmin: boolean
}

/** An artist sees their own chair; owners and admins see the studio's. Cancelled ones are gone. */
function visibleTo(viewer: HomeViewer) {
  return (a: ApiAppointment) => a.status !== 'cancelled' && (viewer.isAdmin || a.staffId === viewer.id)
}

const byTime = (a: ApiAppointment, b: ApiAppointment) => `${a.date}${a.timeSlot}`.localeCompare(`${b.date}${b.timeSlot}`)

export function todaysAppointments(appointments: ApiAppointment[], viewer: HomeViewer, now: Date): ApiAppointment[] {
  const today = toYmd(now)
  return appointments.filter(visibleTo(viewer)).filter((a) => a.date === today).sort(byTime)
}

/** The first appointment after today — what the "today" card offers when today is empty. */
export function nextAppointment(appointments: ApiAppointment[], viewer: HomeViewer, now: Date): ApiAppointment | null {
  const today = toYmd(now)
  return appointments.filter(visibleTo(viewer)).filter((a) => a.date > today).sort(byTime)[0] ?? null
}

export interface StageCount {
  id: string
  label: string
  count: number
  to: '/dashboard/leads' | '/dashboard/projects'
}

/** Where the work stands: people who haven't asked to book, then the board's open columns. */
export function stageCounts(pipeline: PipelineData): StageCount[] {
  const columns = groupByColumn(pipeline.projects, OPEN_COLUMNS)
  return [
    { id: 'leads', label: 'לידים', count: pipeline.leadsWithoutProject.length, to: '/dashboard/leads' },
    ...OPEN_COLUMNS.map((column) => ({
      id: column.id,
      label: column.label,
      count: columns.get(column.id)?.length ?? 0,
      to: '/dashboard/projects' as const,
    })),
  ]
}
