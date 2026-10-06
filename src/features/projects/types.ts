/**
 * The project funnel. `stage` is derived inside PocketBase (pb_hooks/lib/project-stage.js) from
 * the project's appointments and its milestones; the app only writes milestones.
 */
export const PROJECT_STAGES = [
  'inquiry',
  'consultation_scheduled',
  'consultation_done',
  'quoted',
  'booked',
  'in_progress',
  'completed',
  'lost',
] as const
export type ProjectStage = (typeof PROJECT_STAGES)[number]

export const LOST_REASONS = ['price', 'no_response', 'chose_other_studio', 'customer_cancelled', 'no_show', 'other'] as const
export type LostReason = (typeof LOST_REASONS)[number]

/** Who moved a project's milestone, consumed by the stage hook like appointments' status_actor. */
export type StageActor = 'customer' | 'staff' | 'bot' | 'system'

/** One row of the projects pipeline (the leads board). */
export interface PipelineProject {
  projectId: string
  title: string
  stage: ProjectStage
  stageChangedAt: string | null
  customerId: string
  customerName: string | null
  customerPhone: string
  source: string | null
  conversationId: string | null
  staffId: string | null
  staffName: string | null
  quoteMin: number | null
  quoteMax: number | null
  /** The next pending/confirmed appointment, if any. */
  nextAppointmentAt: string | null
  /** Completed sessions, for "session 2 of ~3" on work in progress. */
  sessionsDone: number
  /** The artist's estimate, entered with the quote; null when nobody gave one. */
  estimatedSessions: number | null
  /** Start of the latest completed session: how long the work has been idle between sessions. */
  lastSessionAt: string | null
  lostReason: LostReason | null
  lostNote: string | null
  due: number
  credit: number
}

/** Someone who talked to the bot but never asked to book. */
export interface LeadWithoutProject {
  customerId: string
  name: string | null
  phone: string
  source: string | null
  conversationId: string | null
  updatedAt: string
}

export interface PipelineData {
  projects: PipelineProject[]
  leadsWithoutProject: LeadWithoutProject[]
}

/** Everything the project panel shows and edits. */
export interface ProjectDetails {
  id: string
  title: string
  stage: ProjectStage
  stageChangedAt: string | null
  lostReason: LostReason | null
  lostNote: string | null
  quoteMin: number | null
  quoteMax: number | null
  estimatedSessions: number | null
  customer: { id: string; name: string | null; phone: string }
  /** The viewer may edit it (owner/admin, or its own/unassigned artist). */
  canManage: boolean
  timeline: {
    id: string
    kind: 'consultation' | 'session' | 'touch_up'
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
    date: string
    timeSlot: string
    projectPosition: { sessionNumber: number | null; sessionCount: number; hasConsultation: boolean; appointmentCount: number } | null
  }[]
  /** The customer's other projects, to move an appointment into. */
  otherProjects: { id: string; title: string; stage: ProjectStage }[]
  /** The customer's appointments filed under another project, newest first — to attach one here. */
  attachable: { id: string; kind: 'consultation' | 'session' | 'touch_up'; status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'; date: string; timeSlot: string; projectTitle: string }[]
  /** Who the piece is with; the booking form starts from this artist. */
  primaryStaffId: string | null
  /** Appointments moved to another time, newest first (state_transitions, reason "rescheduled"). */
  reschedules: { appointmentId: string; fromStart: string; toStart: string; actor: string; at: string }[]
}
