import type { ApiAppointment, AppointmentFormValues } from '../types'

/**
 * The booking form's starting values for an appointment that continues an existing one's project:
 * the same customer, artist and piece, in the same project (not a new piece of work).
 */
type FollowUpValues = Partial<AppointmentFormValues>

function sameProjectAndCustomer(appointment: ApiAppointment): FollowUpValues {
  return {
    projectId: appointment.projectId,
    customerId: appointment.customerId,
    chatId: appointment.chatId,
    leadName: appointment.leadName ?? '',
    leadPhone: appointment.leadPhone ?? '',
    type: 'tattoo',
    staffId: appointment.staffId,
    tattooDescription: appointment.style ?? '',
    priceMinIls: null,
    priceMaxIls: null,
    depositPaid: false,
  }
}

/** The tattoo session after a consultation: priced and paid for like any new booking. */
export function tattooAfterConsultationValues(consultation: ApiAppointment): FollowUpValues {
  return {
    ...sameProjectAndCustomer(consultation),
    durationMinutes: 180,
    notes: consultation.hasDeposit && consultation.depositAmount ? `שולמה מקדמת סקיצה בסך ₪${consultation.depositAmount} לקיזוז` : '',
    status: 'pending',
    depositAmount: consultation.hasDeposit ? consultation.depositAmount : null,
  }
}

/**
 * The next session of a multi-session project, booked right after closing one: the piece is already
 * priced and under way, so it's booked as confirmed. A pending one would be released after 48 hours.
 */
export function nextSessionValues(session: ApiAppointment): FollowUpValues {
  return {
    ...sameProjectAndCustomer(session),
    durationMinutes: session.durationMinutes,
    notes: '',
    status: 'confirmed',
    depositAmount: null,
  }
}
