import type PocketBase from 'pocketbase'
import { ClientResponseError } from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import { parseIntegrityViolation } from '@/features/database/utils/integrity-codes'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import type { LostReason, StageActor } from '../types'

/**
 * The milestones a project's stage can't infer from its appointments: a quote was sent, the
 * customer was lost, the piece is finished. The stage itself is derived by PocketBase
 * (pb_hooks/lib/project-stage.js), which also refuses to lose a project that still has a booking.
 */

type Actor = Pick<StaffRecord, 'id' | 'role'>

export interface MilestoneDeps {
  su?: PocketBase
  actor?: Actor
  now?: Date
}

async function resolveDeps(deps: MilestoneDeps) {
  const actor = deps.actor ?? (await requireAuth()).staff
  const su = deps.su ?? (await getSuperuserClient())
  return { actor, su, now: deps.now ?? new Date() }
}

/** Owners and admins manage every project; an artist manages their own and unassigned ones. */
export function canManageProject(actor: Actor, project: RecordModel): boolean {
  if (actor.role === 'owner' || actor.role === 'admin') return true
  const owner: unknown = project.primary_staff
  if (typeof owner !== 'string') return true
  return !owner || owner === actor.id
}

async function loadManagedProject(su: PocketBase, actor: Actor, projectId: string): Promise<RecordModel> {
  const project = await su.collection('projects').getOne(projectId).catch((err: unknown) => {
    if (err instanceof ClientResponseError && err.status === 404) throw new Error('הפרויקט כבר לא קיים. רעננו את הדף.')
    throw err
  })
  if (!canManageProject(actor, project)) throw new Error('אין הרשאה לעדכן פרויקט של מקעקע אחר.')
  return project
}

function attribution(actor: StageActor, reason: string) {
  return { stage_actor: actor, stage_reason: reason }
}

async function updateProject(su: PocketBase, projectId: string, fields: Record<string, unknown>): Promise<RecordModel> {
  try {
    return await su.collection('projects').update(projectId, fields)
  } catch (err) {
    if (err instanceof ClientResponseError && parseIntegrityViolation(err.response?.message) === 'project_has_active_appointments') {
      throw new Error('לפרויקט יש תור עתידי פעיל. יש לבטל אותו לפני שמסמנים את הפרויקט כאבוד.')
    }
    throw new Error(formatDatabaseError(err, 'עדכון הפרויקט נכשל.'))
  }
}

/** A price range was sent to the customer; written only after the message actually went out. */
export async function recordProjectQuote(
  su: PocketBase,
  projectId: string,
  quote: { min: number; max: number },
  now: Date,
): Promise<void> {
  await su.collection('projects').update(projectId, {
    quote_min: quote.min,
    quote_max: quote.max,
    quote_sent_at: now.toISOString(),
    ...attribution('staff', 'price_quote_sent'),
  })
}

export async function handleMarkProjectLost(
  input: { projectId: string; reason: LostReason; note?: string },
  deps: MilestoneDeps = {},
): Promise<RecordModel> {
  const { actor, su, now } = await resolveDeps(deps)
  const project = await loadManagedProject(su, actor, input.projectId)
  if (project.lost_at) throw new Error('הפרויקט כבר מסומן כאבוד.')
  return updateProject(su, input.projectId, {
    lost_at: now.toISOString(),
    lost_reason: input.reason,
    lost_note: input.note?.trim() ?? '',
    ...attribution('staff', `marked_lost:${input.reason}`),
  })
}

/** Undoes "lost" or "completed": the stage goes back to whatever the appointments say. */
export async function handleReopenProject(input: { projectId: string }, deps: MilestoneDeps = {}): Promise<RecordModel> {
  const { actor, su } = await resolveDeps(deps)
  const project = await loadManagedProject(su, actor, input.projectId)
  if (!project.lost_at && !project.completed_at) throw new Error('הפרויקט כבר פתוח.')
  return updateProject(su, input.projectId, {
    lost_at: '',
    lost_reason: '',
    lost_note: '',
    completed_at: '',
    ...attribution('staff', 'reopened'),
  })
}

/** For the exceptions; the usual way a project completes is closing its last session. */
export async function handleCompleteProject(input: { projectId: string }, deps: MilestoneDeps = {}): Promise<RecordModel> {
  const { actor, su, now } = await resolveDeps(deps)
  const project = await loadManagedProject(su, actor, input.projectId)
  if (project.completed_at) throw new Error('הפרויקט כבר הושלם.')
  if (project.lost_at) throw new Error('הפרויקט מסומן כאבוד. יש לפתוח אותו מחדש קודם.')
  return updateProject(su, input.projectId, { completed_at: now.toISOString(), ...attribution('staff', 'completed_manually') })
}
