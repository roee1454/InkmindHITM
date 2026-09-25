import type { ConversationState } from '@/integrations/ai/prompts'
import type { AppointmentKind } from '@/features/calendar/types'

/**
 * What an incoming customer message does to a conversation that finished its last booking,
 * decided from facts instead of a direct state write (the webhook used to set `state: 'NEW'`
 * straight in the database, bypassing the state machine, and left the finished project attached,
 * so the customer's next tattoo landed in it).
 *
 * Nothing moves while the customer still has an upcoming appointment. The same rules as
 * after-appointment.server.ts's planConversationAdvance: a finished consultation leads to booking
 * the tattoo in the same project; anything else starts over.
 */
export interface InboundFacts {
  hasUpcomingAppointment: boolean
  /** The project the bot was booking for, if any. */
  activeProject: { closed: boolean; lastFinishedKind: AppointmentKind | null } | null
  /** When the conversation entered its current state (state_transitions); null when unknown. */
  stateEnteredAt: string | null
}

export interface InboundRoutingInput {
  state: ConversationState
  status: string
  lastMessageAt: string | null
  aiEnabled: boolean
  facts: InboundFacts
  now: Date
}

export interface InboundTransition {
  to: ConversationState
  reason: string
  /** Detach the project, so the next booking starts a new one. */
  clearProject: boolean
  /** Forget the previous booking's collected details. */
  resetBooking: boolean
}

export interface InboundRouting {
  transition: InboundTransition | null
  reactivateBot: boolean
}

const HOUR_MS = 3_600_000
/** A staff takeover nobody touched for this long hands the conversation back to the bot. */
export const STALE_STAFF_HANDLING_HOURS = 24
/** How long a customer has to answer the 1–10 feedback question before the next message starts over. */
export const NPS_ANSWER_WINDOW_DAYS = 7

function startOver(reason: string, clearProject: boolean): InboundTransition {
  return { to: 'NEW', reason, clearProject, resetBooking: true }
}

function nextState(input: InboundRoutingInput): InboundTransition | null {
  const { state, facts, now } = input
  const project = facts.activeProject
  switch (state) {
    case 'AWAITING_APPOINTMENT':
      if (project && !project.closed && project.lastFinishedKind === 'consultation') {
        return { to: 'WANTS_TO_BOOK', reason: 'inbound_after_consultation', clearProject: false, resetBooking: false }
      }
      // An open project (a multi-session piece between sessions) stays attached; a finished one doesn't.
      return startOver('inbound_after_appointment', !project || project.closed)
    case 'COMPLETED':
      return startOver('inbound_after_completed', true)
    case 'AWAIT_NPS_SCORE': {
      const entered = facts.stateEnteredAt ? new Date(facts.stateEnteredAt).getTime() : NaN
      const stillAnswering = !Number.isNaN(entered) && now.getTime() - entered < NPS_ANSWER_WINDOW_DAYS * 24 * HOUR_MS
      return stillAnswering ? null : startOver('inbound_after_nps_window', true)
    }
    default:
      return null
  }
}

export function resolveInboundRouting(input: InboundRoutingInput): InboundRouting {
  if (input.facts.hasUpcomingAppointment) return { transition: null, reactivateBot: false }
  const lastMessage = input.lastMessageAt ? new Date(input.lastMessageAt).getTime() : 0
  const staleTakeover = input.status === 'staff_handling' && input.now.getTime() - lastMessage > STALE_STAFF_HANDLING_HOURS * HOUR_MS
  return {
    transition: nextState(input),
    reactivateBot: input.aiEnabled && (input.status === 'closed' || staleTakeover),
  }
}
