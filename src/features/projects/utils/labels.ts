import type { StatusRole } from '@/components/ui/status-label'
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

/** Status role per stage (DESIGN.md): open inquiries, the money part of the funnel, done, lost. */
export const PROJECT_STAGE_ROLE: Record<ProjectStage, StatusRole> = {
  inquiry: 'new',
  consultation_scheduled: 'new',
  consultation_done: 'new',
  quoted: 'wait',
  booked: 'wait',
  in_progress: 'wait',
  completed: 'done',
  lost: 'dead',
}

export function projectStageOf(value: unknown): ProjectStage {
  return typeof value === 'string' && value in PROJECT_STAGE_LABELS ? (value as ProjectStage) : 'inquiry'
}
