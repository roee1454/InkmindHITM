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
