import type { AppointmentKind } from '@/features/calendar/types'
import type { ProjectPromptContext } from './project-context'

export type ConversationState =
  | 'NEW'
  | 'WANTS_TO_BOOK'
  | 'COLLECTING_INFO'
  | 'WAITLIST'
  | 'AWAIT_PRICE_OFFER'
  | 'AWAIT_HEALTH_NOTICE'
  | 'AWAIT_PAYMENT'
  | 'AWAIT_FINAL_CONFIRMATION'
  | 'AWAITING_APPOINTMENT'
  | 'PROJECT_IN_PROGRESS'
  | 'AWAIT_NPS_SCORE'
  | 'COMPLETED'

export const CALL_STAFF_REASONS = [
  'price_offering',
  'receipt_verification',
  'slot_conflict',
  'artist_assignment',
  'reschedule_request',
  'cancel_request',
  'complaint',
  'unhandled_query',
  'consultation_alert',
  'security_alert',
] as const
export type CallStaffReason = (typeof CALL_STAFF_REASONS)[number]

export interface BuildStaticSystemPromptInput {
  state: ConversationState
  isEscalated: boolean
  staffCallReason?: string | null
  customInstructions?: string
  healthDeclarationFormUrl?: string | null
  studioPoliciesBlock?: string
}

export interface ActiveAppointmentPromptSummary {
  id: string
  date: string
  timeSlot: string
  kind: AppointmentKind
  artistName?: string | null
  status?: string
  tattooDescription?: string | null
}

export interface ReturningCustomerInfo {
  pastAppointmentsCount: number
  lastArtistName?: string | null
  lastTattooDescription?: string | null
}

export interface BuildDynamicSystemPromptInput {
  bookingDate?: string | null
  bookingTime?: string | null
  activeAppointments?: ActiveAppointmentPromptSummary[]
  tattooInfo?: Record<string, unknown> | null
  customerName?: string | null
  returningCustomerInfo?: ReturningCustomerInfo | null
  healthDeclarationSigned?: boolean
  healthDeclarationDate?: string | null
  healthDeclarationValidityMonths?: number
  healthDeclarationFormUrl?: string | null
  activeStaffInstruction?: string | null
  /** The project the conversation is about (prompts/project-context.ts); null when there's none. */
  projectContext?: ProjectPromptContext | null
  /** Injectable for tests; defaults to the current time. */
  now?: Date
}
