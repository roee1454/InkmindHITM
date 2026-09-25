import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { transition } from './state-machine'

/**
 * Where the conversation goes once an appointment is over: a finished consultation reopens booking
 * (WANTS_TO_BOOK — the project stays active, so the tattoo lands in it), a finished session ends the
 * funnel (COMPLETED). Nothing moves while the customer still has another upcoming appointment, and
 * only conversations still waiting on this appointment (AWAITING_APPOINTMENT) are touched.
 */
export interface ConversationAdvance {
  conversationId: string
  to: 'WANTS_TO_BOOK' | 'COMPLETED'
  reason: string
}

export function isConsultation(appointment: RecordModel): boolean {
  const kind = appointment.kind as string | undefined
  return kind ? kind === 'consultation' : appointment.type === 'sketch'
}

export async function planConversationAdvance(
  su: PocketBase,
  appointment: RecordModel,
  options: { upcomingAfter: Date; reason: string },
): Promise<ConversationAdvance | null> {
  const customerId = appointment.customer as string | undefined
  if (!customerId) return null

  const page = await su.collection('conversations').getList(1, 1, { filter: su.filter('customer = {:c}', { c: customerId }) })
  const conversation = page.items[0]
  if (!conversation || conversation.state !== 'AWAITING_APPOINTMENT') return null

  const otherUpcoming = await su.collection('appointments').getList(1, 1, {
    filter: su.filter("customer = {:c} && id != {:id} && (status = 'confirmed' || status = 'pending') && start_time > {:after}", {
      c: customerId,
      id: appointment.id,
      after: options.upcomingAfter,
    }),
    fields: 'id',
  })
  if (otherUpcoming.totalItems > 0) return null

  return {
    conversationId: conversation.id,
    to: isConsultation(appointment) ? 'WANTS_TO_BOOK' : 'COMPLETED',
    reason: options.reason,
  }
}

export async function applyConversationAdvance(
  su: PocketBase,
  advance: ConversationAdvance,
  actor: 'system' | 'staff',
): Promise<void> {
  await transition(su, advance.conversationId, advance.to, {
    actor,
    reason: advance.reason,
    // A consultation hands the conversation back to the bot to book the tattoo.
    extraFields: advance.to === 'WANTS_TO_BOOK' ? { status: 'bot_active', is_staff_called: false, staff_call_reason: '' } : undefined,
  })
}
