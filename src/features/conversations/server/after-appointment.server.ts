import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { transition } from './state-machine'

/**
 * Where the conversation goes once an appointment is over: a finished consultation reopens booking
 * (WANTS_TO_BOOK — the project stays active, so the tattoo lands in it); a finished session ends the
 * funnel (COMPLETED) once its project is completed, and otherwise waits for the next session
 * (PROJECT_IN_PROGRESS). Nothing moves while the customer still has another upcoming appointment,
 * and only conversations about this appointment are touched: waiting on it (AWAITING_APPOINTMENT),
 * or between sessions of its project (PROJECT_IN_PROGRESS) when closing it completes the project.
 */
export interface ConversationAdvance {
  conversationId: string
  to: 'WANTS_TO_BOOK' | 'PROJECT_IN_PROGRESS' | 'COMPLETED'
  reason: string
  /** The project the conversation stays with between sessions (PROJECT_IN_PROGRESS). */
  projectId?: string
}

export function isConsultation(appointment: RecordModel): boolean {
  const kind = appointment.kind as string | undefined
  return kind ? kind === 'consultation' : appointment.type === 'sketch'
}

/**
 * The customer's conversation, if it is waiting for this appointment: in AWAITING_APPOINTMENT, with
 * no other upcoming appointment it could be waiting for instead. Anything that moves a conversation
 * because an appointment ended (the lifecycle tick, a manual status change in the calendar) goes
 * through this, so it never moves a conversation that's about something else.
 */
async function conversationOf(su: PocketBase, customerId: string): Promise<RecordModel | null> {
  const page = await su.collection('conversations').getList(1, 1, { filter: su.filter('customer = {:c}', { c: customerId }) })
  return page.items[0] ?? null
}

async function hasOtherUpcoming(su: PocketBase, appointment: RecordModel, after: Date): Promise<boolean> {
  const page = await su.collection('appointments').getList(1, 1, {
    filter: su.filter("customer = {:c} && id != {:id} && (status = 'confirmed' || status = 'pending') && start_time > {:after}", {
      c: appointment.customer as string,
      id: appointment.id,
      after,
    }),
    fields: 'id',
  })
  return page.totalItems > 0
}

/**
 * The customer's conversation, if it is waiting for this appointment: in AWAITING_APPOINTMENT, with
 * no other upcoming appointment it could be waiting for instead. Anything that moves a conversation
 * because an appointment ended (the lifecycle tick, a manual status change in the calendar) goes
 * through this, so it never moves a conversation that's about something else.
 */
export async function findConversationWaitingOn(su: PocketBase, appointment: RecordModel, upcomingAfter: Date): Promise<RecordModel | null> {
  const customerId = appointment.customer as string | undefined
  if (!customerId) return null
  const conversation = await conversationOf(su, customerId)
  if (!conversation || conversation.state !== 'AWAITING_APPOINTMENT') return null
  return (await hasOtherUpcoming(su, appointment, upcomingAfter)) ? null : conversation
}

async function isProjectCompleted(su: PocketBase, projectId: string): Promise<boolean> {
  if (!projectId) return true
  const project = await su.collection('projects').getOne(projectId, { fields: 'completed_at' }).catch(() => null)
  // An appointment whose project is gone has nothing left to continue.
  return !project || Boolean(project.completed_at)
}

export async function planConversationAdvance(
  su: PocketBase,
  appointment: RecordModel,
  options: { upcomingAfter: Date; reason: string },
): Promise<ConversationAdvance | null> {
  const customerId = appointment.customer as string | undefined
  if (!customerId) return null
  const conversation = await conversationOf(su, customerId)
  if (!conversation) return null
  const projectId = (appointment.project as string) || ''

  if (conversation.state === 'PROJECT_IN_PROGRESS') {
    // Between sessions of this project: closing a session that completes it ends the funnel.
    if (projectId !== conversation.active_project || !(await isProjectCompleted(su, projectId))) return null
    return { conversationId: conversation.id, to: 'COMPLETED', reason: options.reason }
  }

  if (conversation.state !== 'AWAITING_APPOINTMENT' || (await hasOtherUpcoming(su, appointment, options.upcomingAfter))) return null
  if (isConsultation(appointment)) return { conversationId: conversation.id, to: 'WANTS_TO_BOOK', reason: options.reason }
  if (await isProjectCompleted(su, projectId)) return { conversationId: conversation.id, to: 'COMPLETED', reason: options.reason }
  return { conversationId: conversation.id, to: 'PROJECT_IN_PROGRESS', reason: options.reason, projectId }
}

export async function applyConversationAdvance(
  su: PocketBase,
  advance: ConversationAdvance,
  actor: 'system' | 'staff',
): Promise<void> {
  await transition(su, advance.conversationId, advance.to, {
    actor,
    reason: advance.reason,
    extraFields:
      advance.to === 'WANTS_TO_BOOK'
        ? // A consultation hands the conversation back to the bot to book the tattoo.
          { status: 'bot_active', is_staff_called: false, staff_call_reason: '' }
        : advance.to === 'PROJECT_IN_PROGRESS'
          ? { active_project: advance.projectId }
          : undefined,
  })
}
