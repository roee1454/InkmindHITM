import type { AppointmentStatus } from '../types'

/** Who changed an appointment's status, as recorded in state_transitions. */
export type StatusActor = 'customer' | 'staff' | 'bot' | 'system'
export type CancelledBy = 'customer' | 'studio' | 'system'

/**
 * The fields to write together with a status change. pb_hooks/appointment-lifecycle.pb.js stamps
 * the dates and logs the change with this attribution. `cancelledBy` overrides the default derived
 * from the actor, e.g. staff confirming a cancellation the customer asked for.
 */
export function statusChange(
  status: AppointmentStatus,
  actor: StatusActor,
  reason: string,
  cancelledBy?: CancelledBy,
): { status: AppointmentStatus; status_actor: StatusActor; status_reason: string; cancelled_by?: CancelledBy } {
  return {
    status,
    status_actor: actor,
    status_reason: reason.slice(0, 200),
    ...(cancelledBy ? { cancelled_by: cancelledBy } : {}),
  }
}

/**
 * Attribution for a change that isn't a status change — moving an appointment to another time.
 * The lifecycle hook logs it as a reschedule with the old and the new start time.
 */
export function changeAttribution(actor: StatusActor, reason: string): { status_actor: StatusActor; status_reason: string } {
  return { status_actor: actor, status_reason: reason.slice(0, 200) }
}

/**
 * Status changes staff may make by hand in the calendar. Everything is allowed except moves that
 * rewrite history: a finished appointment can't be cancelled or turned back into a hold (that's a
 * refund or a new booking), and a cancelled one can't be marked as having happened.
 */
export const MANUAL_APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled', 'completed', 'no_show'],
  confirmed: ['pending', 'completed', 'no_show', 'cancelled'],
  completed: ['confirmed', 'no_show'],
  no_show: ['confirmed', 'completed', 'cancelled'],
  cancelled: ['pending', 'confirmed'],
}

export function canChangeAppointmentStatus(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return from === to || MANUAL_APPOINTMENT_TRANSITIONS[from].includes(to)
}
