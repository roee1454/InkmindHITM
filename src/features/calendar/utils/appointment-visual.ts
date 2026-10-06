import { appointmentNeedsCloseOut } from '@/features/payments/utils/balance'
import type { ApiAppointment } from '../types'

/**
 * One marker per appointment: the single thing about it that a human should act on.
 * `close_out` outranks `approval` because unclosed money is worse than an unconfirmed slot.
 */
export type AppointmentMarker = 'close_out' | 'approval'

export const MARKER_LABELS: Record<AppointmentMarker, string> = {
  close_out: 'ממתין לסגירה',
  approval: 'ממתין לאישור',
}

export const MARKER_DOT: Record<AppointmentMarker, string> = {
  close_out: 'bg-warning',
  approval: 'bg-status-wait',
}

export interface AppointmentVisual {
  marker: AppointmentMarker | null
  /** Settled or over: the card recedes instead of adding another badge. */
  muted: boolean
  struck: boolean
  /** Not solid yet — the block's border is dashed while it waits for approval. */
  dashed: boolean
}

/**
 * The calendar's visual vocabulary in one place (track-b B6.8), so a block, a month chip and a
 * phone row can't drift apart. Four channels, each carrying exactly one meaning:
 * artist → colour (see `artistColor`), kind → icon, status → border/ink, action → one dot.
 */
export function appointmentVisual(appointment: ApiAppointment, now: number): AppointmentVisual {
  const over = appointment.status === 'cancelled' || appointment.status === 'no_show'
  const pending = appointment.status === 'pending'
  const marker: AppointmentMarker | null = over
    ? null
    : appointmentNeedsCloseOut(appointment, now)
      ? 'close_out'
      : pending
        ? 'approval'
        : null

  return {
    marker,
    muted: over || appointment.status === 'completed',
    struck: over,
    dashed: pending,
  }
}
