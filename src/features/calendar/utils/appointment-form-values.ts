import type { ApiAppointment, AppointmentFormValues } from '../types'

/** An existing appointment as the edit form's values. */
export function appointmentToFormValues(appointment: ApiAppointment): AppointmentFormValues {
  return {
    customerId: appointment.customerId,
    chatId: appointment.chatId,
    leadName: appointment.leadName ?? '',
    leadPhone: appointment.leadPhone ?? '',
    type: appointment.type || 'tattoo',
    date: appointment.date,
    timeSlot: appointment.timeSlot,
    staffId: appointment.staffId,
    durationMinutes: appointment.durationMinutes ?? 120,
    tattooDescription: appointment.style ?? '',
    priceMinIls: appointment.priceMin,
    priceMaxIls: appointment.priceMax,
    depositAmount: appointment.depositAmount,
    status: appointment.status,
    depositPaid: appointment.hasDeposit,
    notes: appointment.notes ?? '',
    allowException: appointment.isException,
    referenceImages: appointment.referenceImages,
    paymentReceiptUrl: appointment.paymentReceiptUrl,
    healthDeclarationSigned: appointment.healthDeclarationSigned,
    healthDeclarationDate: appointment.healthDeclarationDate,
    healthDeclarationFileUrl: appointment.healthDeclarationFileUrl,
    medicalNotes: appointment.medicalNotes,
    healthDeclarationAnswers: appointment.healthDeclarationAnswers,
    allergies: appointment.allergies,
  }
}
