import type { AppointmentFormValues } from '@/features/calendar/types'
import type { ProjectDetails } from '../types'

/**
 * The booking form's starting values for an appointment in this project: its customer, artist and
 * piece, filed under it. A session of work already under way is priced and paid for, so it books
 * as confirmed (like the calendar's next-session follow-up); a quoted piece carries its quote in.
 */
export function projectBookingValues(project: ProjectDetails): Partial<AppointmentFormValues> {
  const quoted = project.stage === 'quoted' || project.stage === 'consultation_done'
  const activeAppointments = project.timeline?.filter((a) => a.status !== 'cancelled' && Boolean(a.date)) ?? []
  const latestApptDate =
    activeAppointments.length > 0
      ? activeAppointments.reduce((latest, a) => (a.date > latest ? a.date : latest), activeAppointments[0]!.date)
      : null

  return {
    projectId: project.id,
    customerId: project.customer.id,
    leadName: project.customer.name ?? '',
    leadPhone: project.customer.phone,
    staffId: project.primaryStaffId,
    type: 'tattoo',
    tattooDescription: project.title,
    priceMinIls: quoted ? project.quoteMin : null,
    priceMaxIls: quoted ? project.quoteMax : null,
    status: project.stage === 'in_progress' ? 'confirmed' : 'pending',
    minDate: latestApptDate,
  }
}
