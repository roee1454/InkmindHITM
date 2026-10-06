import type PocketBase from 'pocketbase'
import { ClientResponseError } from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { applyConversationAdvance, isConsultation, planConversationAdvance } from '@/features/conversations/server/after-appointment.server'
import { reconcileCustomerConversation } from '@/features/conversations/server/reconciler.server'
import { createStaleReferenceError } from '@/lib/stale-reference'
import { firstBatchRequestError, formatDatabaseError } from '@/lib/pocketbase-error'
import { closeOutLock } from '@/lib/async-lock'
import { loadProjectFinance } from './project-finance.server'
import type { CloseSessionInput, ProjectFinance } from '../types'

type Actor = Pick<StaffRecord, 'id' | 'role'>

export interface CloseSessionDeps {
  su?: PocketBase
  actor?: Actor
  now?: Date
}

/**
 * Closes a tattoo session: records what it cost and what was paid on the spot, and marks it
 * completed — in one PocketBase batch (a single transaction), so a session is never left
 * "completed" without its price or with half its payments. Deposits paid earlier are already in the
 * payments ledger and count towards the balance automatically.
 */
export async function handleCloseSession(input: CloseSessionInput, deps: CloseSessionDeps = {}): Promise<ProjectFinance> {
  const actor = deps.actor ?? (await requireAuth()).staff
  const su = deps.su ?? (await getSuperuserClient())
  const now = deps.now ?? new Date()
  // Everything from reading the status to writing the batch runs under one lock per appointment:
  // a double-click or two staff closing the same session at once must not record payments twice.
  return closeOutLock.runExclusive(input.appointmentId, () => closeSessionExclusive(input, actor, su, now))
}

async function closeSessionExclusive(input: CloseSessionInput, actor: Actor, su: PocketBase, now: Date): Promise<ProjectFinance> {
  const appointment = await su.collection('appointments').getOne(input.appointmentId).catch((err: unknown) => {
    if (err instanceof ClientResponseError && err.status === 404) {
      throw createStaleReferenceError('appointments', 'התור כבר לא קיים. היומן רועננה.')
    }
    throw err
  })

  const isAdmin = actor.role === 'owner' || actor.role === 'admin'
  const assignee = (appointment.staff as string) || ''
  if (!isAdmin && assignee && assignee !== actor.id) throw new Error('אין הרשאה לסגור סשן של מקעקע אחר.')
  if (isConsultation(appointment)) throw new Error('פגישת ייעוץ לא נסגרת עם מחיר סופי — מסמנים אותה כהושלמה.')
  if (appointment.status === 'completed') throw new Error('הסשן כבר נסגר.')
  if (appointment.status === 'cancelled') throw new Error('אי אפשר לסגור סשן שבוטל.')
  if (!input.chargeWaived && !(input.finalPrice && input.finalPrice > 0)) throw new Error('יש להזין מחיר סופי, או לסמן "ללא חיוב".')
  if (input.payments.some((p) => !(p.amount > 0))) throw new Error('סכום כל תשלום צריך להיות גדול מאפס.')

  const projectId = appointment.project as string
  const receivedAt = now.toISOString()
  const batch = su.createBatch()
  for (const payment of input.payments) {
    batch.collection('payments').create({
      project: projectId,
      appointment: appointment.id,
      kind: 'payment',
      method: payment.method,
      amount: payment.amount,
      status: 'verified',
      received_at: receivedAt,
      verified_by: actor.id,
      verified_at: receivedAt,
      note: input.note ?? '',
    })
  }
  batch.collection('appointments').update(appointment.id, {
    final_price: input.chargeWaived ? 0 : input.finalPrice,
    charge_waived: input.chargeWaived,
    ...statusChange('completed', 'staff', 'session_closed'),
  })
  // Last in the batch, so the project's stage hook already sees this session completed.
  const project = projectId ? await su.collection('projects').getOne(projectId).catch(() => null) : null
  const projectUpdates: Record<string, unknown> = {}
  if (input.completesProject) {
    projectUpdates.completed_at = receivedAt
    projectUpdates.stage_actor = 'staff'
    projectUpdates.stage_reason = 'last_session_closed'
  }
  if (project && !project.quote_min && !project.quote_max && input.finalPrice && !input.chargeWaived) {
    projectUpdates.quote_min = input.finalPrice
    projectUpdates.quote_max = input.finalPrice
  }
  if (projectId && Object.keys(projectUpdates).length > 0) {
    batch.collection('projects').update(projectId, projectUpdates)
  }

  try {
    await batch.send()
  } catch (err) {
    console.error(`[close-session] closing ${appointment.id} failed:`, err)
    throw new Error(`סגירת הסשן נכשלה ושום דבר לא נשמר. ${formatDatabaseError(firstBatchRequestError(err), 'נסו שוב.')}`)
  }

  const advance = await planConversationAdvance(su, appointment, { upcomingAfter: now, reason: 'session_closed' }).catch(() => null)
  if (advance) await applyConversationAdvance(su, advance, 'staff').catch((err: unknown) => console.error('[close-session] conversation advance failed:', err))
  if (appointment.customer) await reconcileCustomerConversation(su, appointment.customer as string)

  return loadProjectFinance(su, projectId)
}
