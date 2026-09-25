/**
 * The single authority on conversation-state transitions (FLOW-5). Before this module,
 * eight call sites across seven files wrote `state` directly with no validation —
 * nothing stopped a `COMPLETED → AWAIT_PAYMENT` write from corrupting a conversation's
 * funnel position. Every state change now goes through `transition()`, which validates
 * against the table below, logs, and rejects illegal moves loudly.
 *
 * The `state` axis (this module) is the booking funnel. The `status` axis
 * (bot_active / escalated / staff_handling / closed) is the who-is-driving axis and is
 * NOT governed here — escalations legitimately happen from any state.
 *
 * The 48h stale-pending release (lifecycle-service.ts processStalePendingAppointments) moves
 * AWAIT_* → COLLECTING_INFO through transition() like every other caller.
 */
import type PocketBase from 'pocketbase'
import type { ConversationState } from '@/integrations/ai/prompts'
import type { LeadStage } from '@/features/leads/types'
import { addSystemNotification } from '@/features/notifications/server/notifications'

export const TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  // Greeting / non-pushy advisor. Can go to WANTS_TO_BOOK (explicit intent), COLLECTING_INFO, or COMPLETED.
  NEW: ['WANTS_TO_BOOK', 'COLLECTING_INFO', 'COMPLETED'],
  // Inquiring appointment route (sketch consult vs tattoo). Can go to COLLECTING_INFO, AWAIT_PRICE_OFFER, WAITLIST, NEW, or COMPLETED.
  WANTS_TO_BOOK: ['COLLECTING_INFO', 'AWAIT_PRICE_OFFER', 'WAITLIST', 'NEW', 'COMPLETED'],
  // Info collected → pending hold awaits pricing, or waitlist if full.
  COLLECTING_INFO: ['AWAIT_PRICE_OFFER', 'WAITLIST', 'NEW', 'COMPLETED'],
  // WAITLIST: standby queue. Can go to WANTS_TO_BOOK, COLLECTING_INFO, AWAIT_PAYMENT (when slot offered), or COMPLETED.
  WAITLIST: ['WANTS_TO_BOOK', 'COLLECTING_INFO', 'AWAIT_PAYMENT', 'COMPLETED'],
  // Staff priced it → health notice, payment, manual confirm override (Bug 45), or cancelled back to COLLECTING_INFO.
  AWAIT_PRICE_OFFER: ['AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAITING_APPOINTMENT', 'COLLECTING_INFO'],
  // Health declaration step before payment.
  AWAIT_HEALTH_NOTICE: ['AWAIT_PAYMENT', 'AWAITING_APPOINTMENT', 'COLLECTING_INFO', 'COMPLETED'],
  // Deposit confirmed → final summary sent, manual confirm override (Bug 45), or cancellation.
  AWAIT_PAYMENT: ['AWAIT_FINAL_CONFIRMATION', 'AWAITING_APPOINTMENT', 'COLLECTING_INFO'],
  // Customer confirmed → booked. Back: cancellation, expired hold, or staff re-opening payment/quote.
  AWAIT_FINAL_CONFIRMATION: ['AWAITING_APPOINTMENT', 'AWAIT_PAYMENT', 'AWAIT_PRICE_OFFER', 'COLLECTING_INFO'],
  // Appointment done → NPS ask; COMPLETED: closed; COLLECTING_INFO: cancelled; WANTS_TO_BOOK: sketch done -> tattoo booking.
  AWAITING_APPOINTMENT: ['AWAIT_NPS_SCORE', 'COMPLETED', 'COLLECTING_INFO', 'WANTS_TO_BOOK'],
  AWAIT_NPS_SCORE: ['COMPLETED'],
  // A returning customer restarts the funnel.
  COMPLETED: ['NEW', 'WANTS_TO_BOOK', 'COLLECTING_INFO'],
}

const VALID_STATES = new Set(Object.keys(TRANSITIONS) as ConversationState[])

function toState(raw: unknown): ConversationState {
  return VALID_STATES.has(raw as ConversationState) ? (raw as ConversationState) : 'NEW'
}

export function stateToLeadStage(state: ConversationState): LeadStage {
  return state as LeadStage
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: ConversationState,
    readonly to: ConversationState,
  ) {
    super(`מעבר מצב שיחה לא חוקי: ${from} → ${to}`)
    this.name = 'InvalidTransitionError'
  }
}

export interface TransitionOptions {
  actor: 'bot' | 'staff' | 'system'
  /** Short machine-ish cause, e.g. the tool or server-fn name that triggered it. */
  reason: string
  /** Extra conversation fields written atomically with the state (e.g. tattoo_info,
   *  status resets) — callers previously bundled these into one raw update. */
  extraFields?: Record<string, unknown>
}

/**
 * Validates and applies a conversation state change. Self-transitions are allowed and
 * idempotent (a staff double-click or a re-sent price quote must not explode); illegal
 * transitions notify staff and throw, so a bot tool surfaces the failure to the model
 * and a staff server-fn surfaces it in the UI instead of silently corrupting the funnel.
 */
export async function transition(
  su: PocketBase,
  conversationId: string,
  to: ConversationState,
  opts: TransitionOptions,
): Promise<{ from: ConversationState }> {
  const conversation = await su.collection('conversations').getOne(conversationId)
  const from = toState(conversation.state)

  // Best-effort audit write (HITL-11) — the trail must never break the transition itself.
  const audit = (reason: string) =>
    su
      .collection('audit_log')
      .create({ conversation: conversationId, actor: opts.actor, reason, from_state: from, to_state: to })
      .catch(() => null)

  if (from !== to && !TRANSITIONS[from].includes(to)) {
    // If actor is staff and it's a manual override to re-open pricing/payment/scheduling, allow it with audit
    if (opts.actor === 'staff' && (to === 'AWAIT_PAYMENT' || to === 'AWAIT_PRICE_OFFER' || to === 'AWAITING_APPOINTMENT' || to === 'COLLECTING_INFO')) {
      console.warn(`[state-machine] Staff override: allowing ${from} → ${to} (${opts.reason}) conversation=${conversationId}`)
      await audit(`STAFF_OVERRIDE: ${opts.reason}`)
    } else {
      console.error(`[state-machine] REJECTED ${from} → ${to} (${opts.actor}: ${opts.reason}) conversation=${conversationId}`)
      await audit(`REJECTED: ${opts.reason}`)
      await addSystemNotification({
        title: 'נחסם מעבר מצב שיחה לא חוקי',
        message: `ניסיון מעבר ${from} → ${to} (גורם: ${opts.actor}, סיבה: ${opts.reason}). המצב לא שונה — ייתכן שנדרשת בדיקה ידנית של השיחה.`,
        type: 'error',
        link: `/dashboard/conversations?chatId=${conversationId}`,
      }).catch(() => null)
      throw new InvalidTransitionError(from, to)
    }
  }

  await su.collection('conversations').update(conversationId, {
    state: to,
    // A finished funnel ends the project the bot was booking for; the next inquiry starts a new one.
    ...(to === 'COMPLETED' ? { active_project: '' } : {}),
    ...(opts.extraFields ?? {}),
  })

  // Sync customer lead_stage (Bug 43)
  const customerId = conversation.customer as string | undefined
  if (customerId) {
    try {
      const customer = await su.collection('customers').getOne(customerId)
      const targetStage = stateToLeadStage(to)
      if (customer.lead_stage !== targetStage) {
        await su.collection('customers').update(customerId, { lead_stage: targetStage })
      }
    } catch (err) {
      console.warn(`[state-machine] Failed to sync customer lead_stage for ${customerId}:`, err)
    }
  }

  if (from !== to) {
    await audit(opts.reason)
    console.log(`[state-machine] ${from} → ${to} (${opts.actor}: ${opts.reason}) conversation=${conversationId}`)
  }
  return { from }
}
