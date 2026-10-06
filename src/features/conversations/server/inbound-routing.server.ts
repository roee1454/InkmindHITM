import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import type { AppointmentKind } from '@/features/calendar/types'
import { resolveInboundRouting } from '../utils/inbound-routing'
import type { InboundFacts, InboundRouting } from '../utils/inbound-routing'
import { toConversationState, transition } from './state-machine'

function kindOf(record: RecordModel): AppointmentKind {
  const kind = record.kind as string
  if (kind === 'consultation' || kind === 'session' || kind === 'touch_up') return kind
  return record.type === 'sketch' ? 'consultation' : 'session'
}

/** The facts resolveInboundRouting decides on, for one conversation. */
export async function loadInboundFacts(su: PocketBase, conversation: RecordModel, hasUpcomingAppointment: boolean, now: Date): Promise<InboundFacts> {
  const projectId = (conversation.active_project as string) || ''
  const [project, lastFinished, lastEntry] = await Promise.all([
    projectId ? su.collection('projects').getOne(projectId).catch(() => null) : Promise.resolve(null),
    projectId
      ? su
          .collection('appointments')
          .getList(1, 1, {
            filter: su.filter("project = {:p} && start_time <= {:now} && (status = 'completed' || status = 'confirmed')", { p: projectId, now }),
            sort: '-start_time',
          })
          .then((page) => page.items[0] ?? null)
          .catch(() => null)
      : Promise.resolve(null),
    su
      .collection('state_transitions')
      .getList(1, 1, {
        filter: su.filter("entity = 'conversations' && entity_id = {:id} && to = {:state}", { id: conversation.id, state: (conversation.state as string) || '' }),
        sort: '-created',
      })
      .then((page) => page.items[0] ?? null)
      .catch(() => null),
  ])

  return {
    hasUpcomingAppointment,
    activeProject: project ? { closed: Boolean(project.lost_at || project.completed_at), lastFinishedKind: lastFinished ? kindOf(lastFinished) : null } : null,
    stateEnteredAt: (lastEntry?.created as string | undefined) ?? null,
  }
}

/**
 * Applies the routing decision to the conversation, keeping the in-memory record in step so the
 * rest of this webhook (and the bot turn it schedules) sees the new state.
 */
async function applyInboundRouting(su: PocketBase, conv: RecordModel, routing: InboundRouting, nowIso: string): Promise<void> {
  const statusFields: Record<string, unknown> = routing.reactivateBot ? { status: 'bot_active' } : {}
  if (routing.transition) {
    const { to, reason, clearProject, resetBooking } = routing.transition
    const extraFields: Record<string, unknown> = {
      ...statusFields,
      is_staff_called: false,
      staff_call_reason: '',
      ...(resetBooking ? { tattoo_info: null, booking_session_started_at: nowIso } : {}),
      ...(clearProject ? { active_project: '' } : {}),
    }
    try {
      await transition(su, conv.id, to, { actor: 'customer', reason, extraFields })
      Object.assign(conv, extraFields, { state: to })
    } catch (err) {
      console.error(`[webhook] inbound routing ${String(conv.state)} → ${to} failed for ${conv.id}:`, err)
    }
    return
  }
  if (routing.reactivateBot) {
    await su.collection('conversations').update(conv.id, statusFields).catch(() => null)
    Object.assign(conv, statusFields)
  }
}

/**
 * Runs when a customer's message arrives: loads the facts, decides (utils/inbound-routing.ts) and
 * applies the decision. `conv` is updated in place for the rest of the webhook and the bot turn.
 */
export async function routeInboundMessage(
  su: PocketBase,
  conv: RecordModel,
  options: { hasUpcomingAppointment: boolean; aiEnabled: boolean; nowIso: string },
): Promise<InboundRouting> {
  const now = new Date(options.nowIso)
  const facts = await loadInboundFacts(su, conv, options.hasUpcomingAppointment, now)
  const routing = resolveInboundRouting({
    state: toConversationState(conv.state),
    status: (conv.status as string) || '',
    lastMessageAt: (conv.last_message_at as string) || null,
    aiEnabled: options.aiEnabled,
    facts,
    now,
  })
  await applyInboundRouting(su, conv, routing, options.nowIso)
  return routing
}
