import type { ApiAppointment, AppointmentStatus } from '../types'
import { minutesToTime, timeToMinutes } from './date-utils'
import { formatPhoneForDisplay } from '@/lib/phone'

export interface AppointmentStatusVisual {
  label: string
  badgeClass: string
  dotClass: string
  isCancelled: boolean
  isPending: boolean
  isCompleted: boolean
}

export const STATUS_CONFIG: Record<AppointmentStatus, AppointmentStatusVisual> = {
  confirmed: {
    label: 'מאושר',
    badgeClass: 'bg-status-done-soft text-status-done border border-status-done/30',
    dotClass: 'bg-status-done',
    isCancelled: false,
    isPending: false,
    isCompleted: false,
  },
  pending: {
    label: 'ממתין לאישור',
    badgeClass: 'bg-status-wait-soft text-status-wait border border-status-wait/30',
    dotClass: 'bg-status-wait',
    isCancelled: false,
    isPending: true,
    isCompleted: false,
  },
  completed: {
    label: 'הושלם',
    badgeClass: 'bg-muted text-muted-foreground border border-border/60',
    dotClass: 'bg-muted-foreground',
    isCancelled: false,
    isPending: false,
    isCompleted: true,
  },
  cancelled: {
    label: 'בוטל',
    badgeClass: 'bg-destructive/10 text-destructive border border-destructive/20',
    dotClass: 'bg-destructive',
    isCancelled: true,
    isPending: false,
    isCompleted: false,
  },
  no_show: {
    label: 'לא הגיע',
    badgeClass: 'bg-destructive/10 text-destructive border border-destructive/20',
    dotClass: 'bg-destructive',
    isCancelled: true,
    isPending: false,
    isCompleted: false,
  },
}

export function getAppointmentStatusVisual(status: AppointmentStatus): AppointmentStatusVisual {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmed
}

export function formatAppointmentTimeRange(timeSlot: string, durationMinutes: number = 120): string {
  const startMin = timeToMinutes(timeSlot)
  const endMin = startMin + durationMinutes
  return `${timeSlot} – ${minutesToTime(endMin)}`
}

export function formatAppointmentDurationLabel(durationMinutes: number): string {
  if (durationMinutes < 60) return `${durationMinutes} דק׳`
  const hours = durationMinutes / 60
  if (hours === 1) return 'שעה'
  if (hours === 2) return 'שעתיים'
  if (Number.isInteger(hours)) return `${hours} שעות`
  return `${hours} שעות`
}

export function formatAppointmentPrice(priceMin: number | null, priceMax: number | null): string | null {
  if (priceMax === 0) return 'ללא עלות'
  if (priceMin != null && priceMax != null) {
    if (priceMin === priceMax) {
      return `₪${priceMax.toLocaleString()}`
    }
    return `₪${priceMin.toLocaleString()} - ₪${priceMax.toLocaleString()}`
  }
  if (priceMax != null) {
    return `₪${priceMax.toLocaleString()}`
  }
  if (priceMin != null) {
    return `החל מ-₪${priceMin.toLocaleString()}`
  }
  return null
}

export function buildAppointmentTooltip(appointment: ApiAppointment): string {
  const isSketch = appointment.type === 'sketch'
  const visual = getAppointmentStatusVisual(appointment.status)
  const durationText = formatAppointmentDurationLabel(appointment.durationMinutes || 120)
  const timeRange = formatAppointmentTimeRange(appointment.timeSlot, appointment.durationMinutes || 120)
  const clientName = appointment.leadName || 'לקוח ללא שם'
  const price = formatAppointmentPrice(appointment.priceMin, appointment.priceMax)

  return [
    `${timeRange} (${durationText})`,
    isSketch ? 'פגישת סקיצה / ייעוץ' : 'סשן קעקוע',
    `לקוח: ${clientName}${appointment.leadPhone ? ` (${formatPhoneForDisplay(appointment.leadPhone)})` : ''}`,
    appointment.staffName ? `מקעקע: ${appointment.staffName}` : null,
    appointment.style ? `תיאור: ${appointment.style}` : null,
    price ? `מחיר: ${price}` : null,
    appointment.hasDeposit ? 'מקדמה שולמה ✓' : null,
    appointment.healthDeclarationSigned ? 'הצהרת בריאות חתומה ✓' : null,
    appointment.isException ? 'חריגה משעות העבודה ⚠️' : null,
    `סטטוס: ${visual.label}`,
    appointment.notes ? `הערות: ${appointment.notes}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

