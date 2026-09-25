import type { LostReason, ProjectStage } from '../types'

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  inquiry: 'פנייה',
  consultation_scheduled: 'נקבעה פגישת ייעוץ',
  consultation_done: 'בוצעה פגישת ייעוץ',
  quoted: 'נשלחה הצעת מחיר',
  booked: 'נקבע סשן',
  in_progress: 'בעבודה',
  completed: 'הושלם',
  lost: 'אבוד',
}

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  price: 'מחיר',
  no_response: 'לא ענה/תה',
  chose_other_studio: 'בחר/ה סטודיו אחר',
  customer_cancelled: 'הלקוח ביטל',
  no_show: 'לא הגיע/ה',
  other: 'אחר',
}

/** Design-system tokens per stage: open inquiries, the money part of the funnel, done, lost. */
export const PROJECT_STAGE_TONE: Record<ProjectStage, string> = {
  inquiry: 'border-status-new-border text-status-new',
  consultation_scheduled: 'border-status-new-border text-status-new',
  consultation_done: 'border-status-new-border text-status-new',
  quoted: 'border-accent-ink/25 bg-accent-soft text-accent-ink',
  booked: 'border-accent-ink/25 bg-accent-soft text-accent-ink',
  in_progress: 'border-accent-ink/25 bg-accent-soft text-accent-ink',
  completed: 'border-status-done/25 bg-status-done-soft text-status-done',
  lost: 'border-status-dead/25 bg-status-dead-soft text-status-dead',
}

export function projectStageOf(value: unknown): ProjectStage {
  return typeof value === 'string' && value in PROJECT_STAGE_LABELS ? (value as ProjectStage) : 'inquiry'
}
