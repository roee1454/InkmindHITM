import type { ProjectBalance } from '@/features/payments/types'

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type AppointmentType = 'tattoo' | 'sketch'
/** What the appointment is inside its project. Replaces `type` (kept in sync by pb_hooks/projects.pb.js). */
export type AppointmentKind = 'consultation' | 'session' | 'touch_up'

export interface ProjectPosition {
  /** 1-based among the project's sessions that are happening; null for consultations, touch-ups and cancellations. */
  sessionNumber: number | null
  sessionCount: number
  hasConsultation: boolean
  appointmentCount: number
}

export interface ApiAppointment {
  id: string
  /** The tattoo project this appointment belongs to (consultation, sessions and touch-ups share one). */
  projectId: string | null
  kind: AppointmentKind
  projectPosition: ProjectPosition | null
  /** What the session cost, entered when it was closed; null until then. */
  finalPrice: number | null
  chargeWaived: boolean
  /** Money state of the whole project (all its sessions and payments). */
  projectBalance: ProjectBalance | null
  customerId: string
  chatId: string | null
  staffId: string | null
  type?: AppointmentType
  date: string
  timeSlot: string
  status: AppointmentStatus
  createdAt: string
  leadName: string | null
  leadPhone: string | null
  staffName: string | null
  style: string | null
  priceMin: number | null
  priceMax: number | null
  depositAmount: number | null
  hasDeposit: boolean
  durationMinutes: number
  slotConfirmed: boolean
  notes: string | null
  isException: boolean
  source: 'ai_bot' | 'staff_manual'
  referenceImages?: string[]
  paymentReceiptUrl?: string | null
  healthDeclarationSigned?: boolean
  healthDeclarationDate?: string | null
  healthDeclarationFileUrl?: string | null
  medicalNotes?: string | null
  healthDeclarationAnswers?: Record<string, string | number | boolean | null | string[]> | null
  allergies?: string | null
  googleSyncStatus?: 'synced' | 'push_failed' | null
  googleEventId?: string | null
}

export interface AppointmentFormValues {
  /** Set when booking a follow-up inside an existing project (e.g. a session after a consultation). */
  projectId?: string | null
  customerId: string | null
  chatId: string | null
  leadName: string
  leadPhone: string
  type?: AppointmentType
  date: string
  timeSlot: string
  staffId: string | null
  durationMinutes: number
  tattooDescription: string
  priceMinIls: number | null
  priceMaxIls: number | null
  depositAmount: number | null
  status: AppointmentStatus
  depositPaid: boolean
  notes: string
  allowException: boolean
  referenceImages?: string[]
  paymentReceiptUrl?: string | null
  healthDeclarationSigned?: boolean
  healthDeclarationDate?: string | null
  healthDeclarationFileUrl?: string | null
  medicalNotes?: string | null
  healthDeclarationAnswers?: Record<string, string | number | boolean | null | string[]> | null
  allergies?: string | null
}

export interface ApiLead {
  chatId: string
  name: string | null
  phone: string | null
  stage: string
}

export interface ApiExternalBusyPeriod {
  staffId: string
  googleEventId: string
  startsAt: string
  endsAt: string
}

export interface ApiGoogleConnection {
  staffId: string
  googleAccountEmail: string | null
  googleAccountPicture: string | null
  status: 'connected' | 'disconnected' | 'error'
  lastError: string | null
  lastSyncedAt: string | null
}

/** Status roles, not hues: `wait` needs you, `done` is settled, `dead` is over. */
export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: 'bg-accent-soft text-accent-ink border-accent-ink/25 hover:bg-accent-soft',
  confirmed: 'bg-status-done-soft text-status-done border-status-done/25 hover:bg-status-done-soft',
  completed: 'bg-status-done-soft text-status-done border-status-done/25 hover:bg-status-done-soft',
  cancelled: 'bg-status-dead-soft text-status-dead border-status-dead/25 hover:bg-status-dead-soft',
  no_show: 'bg-status-dead-soft text-status-dead border-status-dead/25 hover:bg-status-dead-soft',
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'ממתין לאישור',
  confirmed: 'מאושר',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
}
