import { toCanonicalE164Phone } from '@/lib/phone'
import type { AppointmentFormValues } from '../types'

/** The booking form's values as createAppointment takes them — shared by the calendar and the project panel. */
export function toCreateAppointmentInput(body: AppointmentFormValues) {
  return {
    projectId: body.projectId ?? null,
    customerId: body.customerId,
    chatId: body.chatId,
    leadName: body.leadName,
    leadPhone: body.leadPhone ? toCanonicalE164Phone(body.leadPhone) : '',
    date: body.date,
    timeSlot: body.timeSlot,
    staffId: body.staffId,
    type: body.type,
    durationMinutes: body.durationMinutes,
    tattooDescription: body.tattooDescription,
    priceMinIls: body.priceMinIls,
    priceMaxIls: body.priceMaxIls,
    depositAmount: body.depositAmount,
    status: body.status,
    depositPaid: body.depositPaid,
    notes: body.notes,
    allowException: body.allowException,
  }
}
