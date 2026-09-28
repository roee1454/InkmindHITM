import { formatQuote, formatShortSlot } from '@/features/projects/utils/format'
import type { UIAppointmentSummary, UIConversation } from '../types'
import { STAFF_REASON_LABELS } from './labels'

/**
 * What the thread asks of staff right now: at most one decision, shown above the composer. The
 * order matters; the first match wins (the booking funnel's own state before a generic escalation).
 */
export type ThreadAction =
  | { kind: 'price_offer'; isSketch: boolean }
  | { kind: 'payment'; depositAmount: number | null; hasReceipt: boolean; canAskForClearerReceipt: boolean }
  | { kind: 'slot_conflict' }
  | { kind: 'cancel_request' }
  | { kind: 'sketch_done'; appointmentId: string; staffName: string | null }
  | { kind: 'attention'; reason: string | null; isConsultation: boolean; next: 'quote' | 'book' | null; isSketch: boolean }
  | { kind: 'waiting'; on: 'health' | 'final_confirmation' }
  | { kind: 'none' }

type ConversationFields = Pick<UIConversation, 'state' | 'status' | 'staffCallReason'>

export function resolveThreadAction(
  conversation: ConversationFields,
  appointment: UIAppointmentSummary | null,
  hasReceipt: boolean,
): ThreadAction {
  const { state, status, staffCallReason } = conversation
  const isSketch = appointment?.type === 'sketch'

  if (state === 'AWAIT_PRICE_OFFER') return { kind: 'price_offer', isSketch }
  if (state === 'AWAIT_HEALTH_NOTICE') return { kind: 'waiting', on: 'health' }
  if (state === 'AWAIT_PAYMENT') {
    return {
      kind: 'payment',
      depositAmount: appointment?.depositAmount ?? null,
      hasReceipt,
      canAskForClearerReceipt: staffCallReason === 'receipt_verification',
    }
  }
  if (state === 'AWAIT_FINAL_CONFIRMATION') return { kind: 'waiting', on: 'final_confirmation' }
  if (staffCallReason === 'slot_conflict' && appointment) return { kind: 'slot_conflict' }
  if (staffCallReason === 'cancel_request') return { kind: 'cancel_request' }
  // Before the generic escalation: a finished sketch is otherwise "not confirmed", and would offer a quote.
  if (appointment && isSketch && appointment.status === 'completed' && state === 'WANTS_TO_BOOK') {
    return { kind: 'sketch_done', appointmentId: appointment.id, staffName: appointment.staffName }
  }
  if (status === 'escalated' || staffCallReason) {
    const next = !appointment
      ? 'book'
      : appointment.status !== 'confirmed' && state !== 'AWAITING_APPOINTMENT'
        ? 'quote'
        : null
    return {
      kind: 'attention',
      reason: staffCallReason ? (STAFF_REASON_LABELS[staffCallReason] ?? staffCallReason) : null,
      isConsultation: staffCallReason === 'consultation_alert',
      next,
      isSketch,
    }
  }
  return { kind: 'none' }
}

/** The appointment a decision is about, in one line: "ה׳ 2.10 · 12:00 · מרב · ₪600–800". */
export function appointmentFacts(appointment: UIAppointmentSummary | null): string {
  if (!appointment) return ''
  const slot = appointment.date && appointment.timeSlot ? formatShortSlot(`${appointment.date}T${appointment.timeSlot}`) : ''
  const quote = formatQuote(appointment.priceMinIls || null, appointment.priceMaxIls || null)
  return [slot, appointment.staffName, quote].filter(Boolean).join(' · ')
}
