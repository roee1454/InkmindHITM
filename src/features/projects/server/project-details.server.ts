import type PocketBase from 'pocketbase'
import { ClientResponseError } from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import { toLedgerAppointment } from '@/features/payments/server/project-finance.server'
import { computeProjectPositions } from '@/features/calendar/utils/project-position'
import { minutesToTime, toYmd } from '@/lib/date-utils'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { parseIntegrityViolation } from '@/features/database/utils/integrity-codes'
import { LOST_REASONS } from '../types'
import type { ProjectDetails } from '../types'
import { projectStageOf } from '../utils/labels'
import { canManageProject } from './project-milestones.server'

type Actor = Pick<StaffRecord, 'id' | 'role'>

export interface ProjectDetailsDeps {
  su?: PocketBase
  actor?: Actor
}

async function resolveDeps(deps: ProjectDetailsDeps) {
  return { actor: deps.actor ?? (await requireAuth()).staff, su: deps.su ?? (await getSuperuserClient()) }
}

async function loadProject(su: PocketBase, projectId: string): Promise<RecordModel> {
  return su.collection('projects').getOne(projectId, { expand: 'customer' }).catch((err: unknown) => {
    if (err instanceof ClientResponseError && err.status === 404) throw new Error('הפרויקט כבר לא קיים. רעננו את הדף.')
    throw err
  })
}

function positive(value: unknown): number | null {
  return typeof value === 'number' && value > 0 ? value : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

export async function handleGetProjectDetails(projectId: string, deps: ProjectDetailsDeps = {}): Promise<ProjectDetails> {
  const { actor, su } = await resolveDeps(deps)
  const project = await loadProject(su, projectId)
  const customerId = project.customer as string
  const [appointments, siblings] = await Promise.all([
    su.collection('appointments').getFullList({ filter: su.filter('project = {:p}', { p: projectId }), sort: 'start_time' }),
    su.collection('projects').getFullList({ filter: su.filter('customer = {:c} && id != {:p}', { c: customerId, p: projectId }), sort: '-created' }),
  ])

  const ledger = appointments.map(toLedgerAppointment)
  const positions = computeProjectPositions(ledger.map((a) => ({ id: a.id, projectId, kind: a.kind, status: a.status, startTime: a.startTime })))
  const customer: unknown = project.expand?.customer
  const customerRecord = customer && typeof customer === 'object' ? (customer as RecordModel) : null

  return {
    id: project.id,
    title: (project.title as string) || '',
    stage: projectStageOf(project.stage),
    stageChangedAt: text(project.stage_changed_at),
    lostReason: LOST_REASONS.find((r) => r === project.lost_reason) ?? null,
    lostNote: text(project.lost_note),
    quoteMin: positive(project.quote_min),
    quoteMax: positive(project.quote_max),
    estimatedSessions: positive(project.estimated_sessions),
    customer: { id: customerId, name: text(customerRecord?.name), phone: (customerRecord?.phone as string) || '' },
    canManage: canManageProject(actor, project),
    timeline: ledger.map((a) => {
      const start = new Date(a.startTime)
      return {
        id: a.id,
        kind: a.kind,
        status: a.status,
        date: toYmd(start),
        timeSlot: minutesToTime(start.getHours() * 60 + start.getMinutes()),
        projectPosition: positions.get(a.id) ?? null,
      }
    }),
    otherProjects: siblings.map((p) => ({ id: p.id, title: (p.title as string) || 'ללא כותרת', stage: projectStageOf(p.stage) })),
  }
}

async function requireManaged(su: PocketBase, actor: Actor, projectId: string): Promise<RecordModel> {
  const project = await loadProject(su, projectId)
  if (!canManageProject(actor, project)) throw new Error('אין הרשאה לעדכן פרויקט של מקעקע אחר.')
  return project
}

export interface ProjectDetailsUpdate {
  projectId: string
  title: string
  quoteMin: number | null
  quoteMax: number | null
  estimatedSessions: number | null
}

/** Name, quote and session estimate. Editing the quote isn't "sending" it, so the stage stays. */
export async function handleUpdateProjectDetails(input: ProjectDetailsUpdate, deps: ProjectDetailsDeps = {}): Promise<void> {
  const { actor, su } = await resolveDeps(deps)
  await requireManaged(su, actor, input.projectId)
  if (input.quoteMin !== null && input.quoteMax !== null && input.quoteMin > input.quoteMax) {
    throw new Error('המחיר המינימלי גבוה מהמקסימלי.')
  }
  await su.collection('projects').update(input.projectId, {
    title: input.title.trim(),
    quote_min: input.quoteMin ?? 0,
    quote_max: input.quoteMax ?? 0,
    estimated_sessions: input.estimatedSessions ?? 0,
  })
}

/**
 * Fixes a misfiled appointment: into another project of the same customer, or into a new one.
 * PocketBase re-derives both projects' stages and refuses a project of another customer.
 */
export async function handleMoveAppointment(
  input: { appointmentId: string; target: string | 'new' },
  deps: ProjectDetailsDeps = {},
): Promise<{ projectId: string }> {
  const { actor, su } = await resolveDeps(deps)
  const appointment = await su.collection('appointments').getOne(input.appointmentId).catch((err: unknown) => {
    if (err instanceof ClientResponseError && err.status === 404) throw new Error('התור כבר לא קיים. רעננו את הדף.')
    throw err
  })
  await requireManaged(su, actor, appointment.project as string)

  let target = input.target
  if (target === 'new') {
    const created = await su.collection('projects').create({
      customer: appointment.customer,
      title: ((appointment.tattoo_description as string) || 'פרויקט חדש').slice(0, 200),
      primary_staff: (appointment.staff as string) || '',
      stage_actor: 'staff',
      stage_reason: 'split_from_project',
    })
    target = created.id
  } else {
    await requireManaged(su, actor, target)
  }

  try {
    await su.collection('appointments').update(appointment.id, { project: target })
  } catch (err) {
    if (err instanceof ClientResponseError && parseIntegrityViolation(err.response?.message) === 'project_customer_mismatch') {
      throw new Error('אפשר להעביר תור רק לפרויקט של אותו לקוח.')
    }
    throw new Error(formatDatabaseError(err, 'העברת התור נכשלה.'))
  }
  return { projectId: target }
}
