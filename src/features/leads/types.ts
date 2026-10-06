export type LeadStage =
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

export interface StageDefinition {
  stage: LeadStage
  label: string
  /** Badge color classes for light and dark themes */
  badgeClass: string
  /** Dot / indicator color */
  dotClass: string
}

export const STAGE_CONFIG: Record<LeadStage, StageDefinition> = {
  NEW: {
    stage: 'NEW',
    label: 'ליד חדש',
    badgeClass: 'border-status-new-border text-status-new hover:bg-muted',
    dotClass: 'bg-status-new',
  },
  WANTS_TO_BOOK: {
    stage: 'WANTS_TO_BOOK',
    label: 'בירור מסלול',
    badgeClass: 'border-status-new-border text-status-new hover:bg-muted',
    dotClass: 'bg-status-new',
  },
  COLLECTING_INFO: {
    stage: 'COLLECTING_INFO',
    label: 'איסוף פרטים',
    badgeClass: 'border-status-new-border text-status-new hover:bg-muted',
    dotClass: 'bg-status-new',
  },
  WAITLIST: {
    stage: 'WAITLIST',
    label: 'רשימת המתנה',
    badgeClass: 'border-status-new-border text-status-new hover:bg-muted',
    dotClass: 'bg-status-new',
  },
  AWAIT_PRICE_OFFER: {
    stage: 'AWAIT_PRICE_OFFER',
    label: 'ממתין לתמחור',
    badgeClass: 'bg-accent-soft text-accent-ink border-accent-ink/25 hover:bg-accent-soft',
    dotClass: 'bg-accent-ink',
  },
  AWAIT_HEALTH_NOTICE: {
    stage: 'AWAIT_HEALTH_NOTICE',
    label: 'הצהרת בריאות',
    badgeClass: 'bg-accent-soft text-accent-ink border-accent-ink/25 hover:bg-accent-soft',
    dotClass: 'bg-accent-ink',
  },
  AWAIT_PAYMENT: {
    stage: 'AWAIT_PAYMENT',
    label: 'ממתין למקדמה',
    badgeClass: 'bg-accent-soft text-accent-ink border-accent-ink/25 hover:bg-accent-soft',
    dotClass: 'bg-accent-ink',
  },
  AWAIT_FINAL_CONFIRMATION: {
    stage: 'AWAIT_FINAL_CONFIRMATION',
    label: 'אישור סופי',
    badgeClass: 'bg-accent-soft text-accent-ink border-accent-ink/25 hover:bg-accent-soft',
    dotClass: 'bg-accent-ink',
  },
  AWAITING_APPOINTMENT: {
    stage: 'AWAITING_APPOINTMENT',
    label: 'נקבע תור',
    badgeClass: 'bg-status-done-soft text-status-done border-status-done/25 hover:bg-status-done-soft',
    dotClass: 'bg-status-done',
  },
  PROJECT_IN_PROGRESS: {
    stage: 'PROJECT_IN_PROGRESS',
    label: 'באמצע פרויקט',
    badgeClass: 'bg-accent-soft text-accent-ink border-accent-ink/25 hover:bg-accent-soft',
    dotClass: 'bg-accent-ink',
  },
  AWAIT_NPS_SCORE: {
    stage: 'AWAIT_NPS_SCORE',
    label: 'משוב ודירוג',
    badgeClass: 'bg-status-done-soft text-status-done border-status-done/25 hover:bg-status-done-soft',
    dotClass: 'bg-status-done',
  },
  COMPLETED: {
    stage: 'COMPLETED',
    label: 'סגור / הושלם',
    badgeClass: 'bg-status-done-soft text-status-done border-status-done/25 hover:bg-status-done-soft',
    dotClass: 'bg-status-done',
  },
}

/** WAHA's source-detection keywords, plus 'whatsapp' — the only source the webhook sets
 *  today (see conversations/server/webhook.ts). */
export const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'וואטסאפ',
  instagram: 'אינסטגרם',
  google: 'גוגל',
  facebook: 'פייסבוק',
  website: 'אתר',
  referral: 'המלצה',
}

/** A `customers` row flattened with its (at most one, enforced 1:1) conversation's id and
 *  assigned staff, pre-resolved so a card never needs a second round-trip. */
export interface UILead {
  id: string // customers.id
  conversationId: string | null
  name: string | null
  phone: string
  stage: LeadStage
  source: string | null
  assignedStaffId: string | null
  createdAt: string
  updatedAt: string
}
