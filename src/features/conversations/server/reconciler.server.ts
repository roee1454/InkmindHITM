import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { addSystemNotification } from '@/features/notifications/server/notifications'
import type { ConversationState } from '@/integrations/ai/prompts'
import { detectStateDrift, RECONCILED_STATES } from '../utils/state-drift'
import type { DriftCorrection, DriftFacts } from '../utils/state-drift'
import { conversationStateLabel } from '../utils/labels'
import { loadInboundFacts } from './inbound-routing.server'
import { toConversationState, transition } from './state-machine'

/** One conversation to correct, as the lifecycle tick plans it (see utils/state-drift.ts). */
export interface ReconcileAction extends DriftCorrection {
  conversationId: string
  customerName: string
  from: ConversationState
}

const DAY_MS = 24 * 60 * 60 * 1000

async function openAppointments(su: PocketBase, customerId: string, now: Date): Promise<DriftFacts['openAppointments']> {
  const rows = await su.collection('appointments').getFullList({
    filter: su.filter("customer = {:c} && (status = 'pending' || status = 'confirmed') && start_time >= {:since}", {
      c: customerId,
      since: new Date(now.getTime() - DAY_MS),
    }),
    fields: 'status,start_time',
  })
  return rows.map((row) => ({ status: row.status as 'pending' | 'confirmed', startsAt: row.start_time as string }))
}

async function planFor(su: PocketBase, conversation: RecordModel, now: Date, graceMinutes?: number): Promise<ReconcileAction | null> {
  const customerId = conversation.customer as string
  if (!customerId) return null
  const [appointments, inbound] = await Promise.all([openAppointments(su, customerId, now), loadInboundFacts(su, conversation, false, now)])
  const from = toConversationState(conversation.state)
  const correction = detectStateDrift({
    state: from,
    hasActiveProject: Boolean(conversation.active_project),
    facts: { openAppointments: appointments, activeProject: inbound.activeProject, stateEnteredAt: inbound.stateEnteredAt },
    now,
    graceMinutes,
  })
  if (!correction) return null
  const customerName = (conversation.expand?.customer?.name as string | undefined) || 'לקוח'
  return { ...correction, conversationId: conversation.id, customerName, from }
}

/** Every conversation whose state contradicts the facts, and what fixes it. */
export async function planReconciliation(su: PocketBase, now: Date): Promise<ReconcileAction[]> {
  const conversations = await su.collection('conversations').getFullList({
    filter: RECONCILED_STATES.map((state) => `state = '${state}'`).join(' || '),
    expand: 'customer',
  })
  const actions: ReconcileAction[] = []
  for (const conversation of conversations) {
    const action = await planFor(su, conversation, now)
    if (action) actions.push(action)
  }
  return actions
}

/**
 * Right after staff change a customer's appointments in the calendar (book, confirm, cancel, move,
 * delete, close a session), their conversation follows at once instead of on the next lifecycle
 * tick. Staff made the change, so nothing of theirs is still in flight (no grace period) and they
 * aren't notified about its expected consequence. Never throws: the tick is the safety net.
 */
export async function reconcileCustomerConversation(su: PocketBase, customerId: string, now: Date = new Date()): Promise<void> {
  try {
    const page = await su.collection('conversations').getList(1, 1, { filter: su.filter('customer = {:c}', { c: customerId }), expand: 'customer' })
    const conversation = page.items[0]
    if (!conversation) return
    const action = await planFor(su, conversation, now, 0)
    if (action) await applyReconcileAction(su, action, { notify: false })
  } catch (err) {
    console.error(`[reconciler] reconciling the conversation of ${customerId} after a calendar change failed:`, err)
  }
}

export async function applyReconcileAction(su: PocketBase, action: ReconcileAction, options: { notify: boolean } = { notify: true }): Promise<void> {
  if (action.to) {
    await transition(su, action.conversationId, action.to, {
      actor: 'system',
      reason: action.reason,
      extraFields: action.clearProject ? { active_project: '' } : undefined,
    })
  } else if (action.clearProject) {
    await su.collection('conversations').update(action.conversationId, { active_project: '' })
  }

  if (!options.notify) return
  const change = action.to
    ? `${conversationStateLabel(action.from)} ← ${conversationStateLabel(action.to)}`
    : 'הפרויקט שהסתיים נותק מהשיחה'
  await addSystemNotification({
    title: 'מצב השיחה תוקן אוטומטית',
    message: `${action.customerName}: ${change}. מצב השיחה לא התאים לתורים ולפרויקט בפועל.`,
    type: 'warning',
    link: `/dashboard/conversations?chatId=${action.conversationId}`,
  }).catch(() => null)
}
