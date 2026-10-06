import type { ConversationState } from '@/integrations/ai/prompts'

/** A booking flow waiting on its own hold: pricing, health notice, payment, final confirmation. */
const HOLD_FLOW_STATES: ConversationState[] = ['AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION']

/**
 * Where the conversation goes after one of the customer's appointments is cancelled — only when the
 * conversation is actually about that appointment. A customer can have an upcoming session and, at
 * the same time, be booking another piece; cancelling one must not wipe the conversation about the
 * other.
 * - The hold a booking flow was waiting on → back to collecting details.
 * - The appointment the conversation was waiting for, with nothing else upcoming → done.
 * - Anything else → the conversation stays where it is.
 */
export function stateAfterCancellation(input: {
  state: ConversationState
  cancelled: 'pending' | 'confirmed'
  otherUpcoming: number
}): ConversationState | null {
  if (HOLD_FLOW_STATES.includes(input.state)) return input.cancelled === 'pending' ? 'COLLECTING_INFO' : null
  if (input.state === 'AWAITING_APPOINTMENT' && input.otherUpcoming === 0) return 'COMPLETED'
  return null
}
