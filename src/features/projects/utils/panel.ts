import type { ProjectFinance } from '@/features/payments/types'
import type { ProjectDetails } from '../types'

type TimelineItem = ProjectDetails['timeline'][number]

/** One appointment as the project panel lists it. */
export interface PanelAppointment extends TimelineItem {
  /** Local start as an ISO-like string, for formatShortSlot. */
  start: string
  /** The next pending/confirmed appointment still ahead. */
  isNext: boolean
  /** What the session was closed at; null until it's closed (or when it wasn't charged). */
  finalPrice: number | null
  chargeWaived: boolean
  /** The latest time this appointment was moved, if it ever was. */
  movedFrom: { start: string; actor: string } | null
}

export interface PanelSummary {
  appointments: PanelAppointment[]
  sessionsDone: number
  next: PanelAppointment | null
}

/**
 * The project panel's timeline: every appointment oldest first, with what it was charged (from the
 * finance ledger, when loaded) and its latest reschedule folded in, so the panel shows one list
 * instead of a timeline, a separate price table and a separate "reschedules" box.
 */
export function summarizeProject(details: ProjectDetails, finance: ProjectFinance | undefined, now: Date): PanelSummary {
  const ledger = new Map((finance?.appointments ?? []).map((a) => [a.id, a]))
  const nowMs = now.getTime()

  const ordered = details.timeline
    .map((item) => ({ item, start: `${item.date}T${item.timeSlot}:00` }))
    .sort((a, b) => a.start.localeCompare(b.start))

  const nextId = ordered.find(
    ({ item, start }) => (item.status === 'pending' || item.status === 'confirmed') && new Date(start).getTime() > nowMs,
  )?.item.id

  const appointments = ordered.map(({ item, start }): PanelAppointment => {
    const charge = ledger.get(item.id)
    // `reschedules` is newest first, so the first match is the move that set the current time.
    const moved = details.reschedules.find((r) => r.appointmentId === item.id)
    return {
      ...item,
      start,
      isNext: item.id === nextId,
      finalPrice: charge?.finalPrice ?? null,
      chargeWaived: charge?.chargeWaived ?? false,
      movedFrom: moved ? { start: moved.fromStart, actor: moved.actor } : null,
    }
  })

  return {
    appointments,
    sessionsDone: appointments.filter((a) => a.kind === 'session' && a.status === 'completed').length,
    next: appointments.find((a) => a.isNext) ?? null,
  }
}
