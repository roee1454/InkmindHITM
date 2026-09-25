import type { AppointmentKind, AppointmentStatus, ProjectPosition } from '../types'

export interface ProjectAppointmentRef {
  id: string
  projectId: string | null
  kind: AppointmentKind
  status: AppointmentStatus
  startTime: string
}

const NOT_HAPPENING: AppointmentStatus[] = ['cancelled', 'no_show']

/**
 * Where each appointment sits inside its project — "session 2 of 3", "follows a consultation".
 * Cancelled and no-show appointments are listed in the project but don't count as sessions, so a
 * rebooked session keeps its number.
 */
export function computeProjectPositions(appointments: ProjectAppointmentRef[]): Map<string, ProjectPosition> {
  const byProject = new Map<string, ProjectAppointmentRef[]>()
  for (const appointment of appointments) {
    if (!appointment.projectId) continue
    const group = byProject.get(appointment.projectId) ?? []
    group.push(appointment)
    byProject.set(appointment.projectId, group)
  }

  const positions = new Map<string, ProjectPosition>()
  for (const group of byProject.values()) {
    const ordered = [...group].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const sessions = ordered.filter((a) => a.kind === 'session' && !NOT_HAPPENING.includes(a.status))
    const hasConsultation = ordered.some((a) => a.kind === 'consultation' && !NOT_HAPPENING.includes(a.status))
    for (const appointment of ordered) {
      const index = sessions.findIndex((s) => s.id === appointment.id)
      positions.set(appointment.id, {
        sessionNumber: index === -1 ? null : index + 1,
        sessionCount: sessions.length,
        hasConsultation,
        appointmentCount: ordered.length,
      })
    }
  }
  return positions
}

/** The short label on appointment cards: "סקיצה", "טאץ'-אפ", "קעקוע", or "סשן 2" inside a project. */
export function appointmentKindLabel(kind: AppointmentKind, position: ProjectPosition | null): string {
  if (kind === 'consultation') return 'סקיצה'
  if (kind === 'touch_up') return "טאץ'-אפ"
  if (position?.sessionNumber && (position.sessionCount > 1 || position.hasConsultation)) {
    return `סשן ${position.sessionNumber}`
  }
  return 'קעקוע'
}
