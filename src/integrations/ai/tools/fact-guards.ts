/**
 * Tools the bot may use depend on the facts, not only on the dialogue state: a conversation state can
 * be wrong (a bug, a manual edit, a partial failure), and the bot must still never offer to cancel an
 * appointment that doesn't exist or confirm a hold whose deposit wasn't verified. The state picks the
 * tools that fit the dialogue (state-prompts.ts STATE_TOOLS); these guards remove the ones the facts
 * rule out. Every guarded tool re-checks the same fact when it runs, since facts can change mid-turn.
 */

export interface UpcomingAppointmentFact {
  status: 'pending' | 'confirmed'
  /** No deposit is due, or it was received. */
  depositSettled: boolean
}

export interface ConversationFacts {
  /** The customer's pending and confirmed appointments that haven't passed yet. */
  upcoming: UpcomingAppointmentFact[]
}

/** An appointments row (reads status, deposit_amount and deposit_paid). */
type AppointmentFields = Readonly<Record<string, unknown>>

export function isDepositSettled(appointment: AppointmentFields): boolean {
  return (Number(appointment.deposit_amount) || 0) <= 0 || Boolean(appointment.deposit_paid)
}

/** A hold the customer can confirm themselves: still pending, with its deposit settled. */
export function isHoldReadyToConfirm(appointment: AppointmentFields): boolean {
  return appointment.status === 'pending' && isDepositSettled(appointment)
}

/** Facts from the appointments the bot turn already loads (getActiveAppointmentsForBot). */
export function toConversationFacts(activeAppointments: readonly AppointmentFields[]): ConversationFacts {
  return {
    upcoming: activeAppointments
      .filter((a) => a.status === 'pending' || a.status === 'confirmed')
      .map((a) => ({ status: a.status as 'pending' | 'confirmed', depositSettled: isDepositSettled(a) })),
  }
}

const GUARDS: Record<string, (facts: ConversationFacts) => boolean> = {
  request_cancel: (f) => f.upcoming.length > 0,
  request_reschedule: (f) => f.upcoming.length > 0,
  flag_earlier_preference: (f) => f.upcoming.some((a) => a.status === 'confirmed'),
  confirm_booking_final: (f) => f.upcoming.some((a) => a.status === 'pending' && a.depositSettled),
}

export function applyFactGuards(tools: readonly string[], facts: ConversationFacts): string[] {
  return tools.filter((tool) => GUARDS[tool]?.(facts) ?? true)
}
