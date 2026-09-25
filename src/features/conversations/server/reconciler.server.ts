import type PocketBase from 'pocketbase'
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
    fields: 'status',
  })
  return rows.map((row) => ({ status: row.status as 'pending' | 'confirmed' }))
}

/** Every conversation whose state contradicts the facts, and what fixes it. */
export async function planReconciliation(su: PocketBase, now: Date): Promise<ReconcileAction[]> {
  const conversations = await su.collection('conversations').getFullList({
    filter: RECONCILED_STATES.map((state) => `state = '${state}'`).join(' || '),
    expand: 'customer',
  })

  const actions: ReconcileAction[] = []
  for (const conversation of conversations) {
    const customerId = conversation.customer as string
    if (!customerId) continue
    const [appointments, inbound] = await Promise.all([
      openAppointments(su, customerId, now),
      loadInboundFacts(su, conversation, false, now),
    ])
    const from = toConversationState(conversation.state)
    const correction = detectStateDrift({
      state: from,
      hasActiveProject: Boolean(conversation.active_project),
      facts: { openAppointments: appointments, activeProject: inbound.activeProject, stateEnteredAt: inbound.stateEnteredAt },
      now,
    })
    if (!correction) continue
    const customerName = (conversation.expand?.customer?.name as string | undefined) || 'לקוח'
    actions.push({ ...correction, conversationId: conversation.id, customerName, from })
  }
  return actions
}

export async function applyReconcileAction(su: PocketBase, action: ReconcileAction): Promise<void> {
  if (action.to) {
    await transition(su, action.conversationId, action.to, {
      actor: 'system',
      reason: action.reason,
      extraFields: action.clearProject ? { active_project: '' } : undefined,
    })
  } else if (action.clearProject) {
    await su.collection('conversations').update(action.conversationId, { active_project: '' })
  }

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
