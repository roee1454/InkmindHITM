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
 * KEEP IN SYNC: pocketbase/pb_hooks/cron.pb.js performs the same
 * AWAIT_* → COLLECTING_INFO release inside PocketBase's own cron (it can't call this
 * module). If the table changes around those states, update the hook too.
 */
import type PocketBase from 'pocketbase'
import type { ConversationState } from '@/integrations/ai/prompts'
import { addSystemNotification } from '@/features/notifications/server/notifications'

export const TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  // Greeting → info collection; COMPLETED covers a conversation opened by mistake.
  NEW: ['COLLECTING_INFO', 'COMPLETED'],
  // Info collected → pending hold awaits pricing. COMPLETED: customer walks away.
  COLLECTING_INFO: ['AWAIT_PRICE_OFFER', 'COMPLETED'],
  // Staff priced it → customer pays. Back to COLLECTING_INFO: hold cancelled/expired.
  AWAIT_PRICE_OFFER: ['AWAIT_PAYMENT', 'COLLECTING_INFO'],
  // Deposit confirmed → final summary sent. Back: cancellation or expired hold.
  AWAIT_PAYMENT: ['AWAIT_FINAL_CONFIRMATION', 'COLLECTING_INFO'],
  // Customer confirmed → booked. Back: cancellation or expired hold.
  AWAIT_FINAL_CONFIRMATION: ['AWAITING_APPOINTMENT', 'COLLECTING_INFO'],
  // Appointment done → NPS ask; COMPLETED: closed without NPS; COLLECTING_INFO: cancelled → rebook.
  AWAITING_APPOINTMENT: ['AWAIT_NPS_SCORE', 'COMPLETED', 'COLLECTING_INFO'],
  AWAIT_NPS_SCORE: ['COMPLETED'],
  // A returning customer restarts the funnel.
  COMPLETED: ['COLLECTING_INFO'],
}

const VALID_STATES = new Set(Object.keys(TRANSITIONS) as ConversationState[])

function toState(raw: unknown): ConversationState {
  return VALID_STATES.has(raw as ConversationState) ? (raw as ConversationState) : 'NEW'
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

  await su.collection('conversations').update(conversationId, {
    state: to,
    ...(opts.extraFields ?? {}),
  })

  if (from !== to) {
    await audit(opts.reason)
    console.log(`[state-machine] ${from} → ${to} (${opts.actor}: ${opts.reason}) conversation=${conversationId}`)
  }
  return { from }
}
