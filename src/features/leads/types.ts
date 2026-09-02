export type LeadStage =
  | 'new'
  | 'intake'
  | 'awaiting_price'
  | 'awaiting_payment'
  | 'booked'
  | 'expired'

export interface StageDefinition {
  stage: LeadStage
  label: string
  /** Badge color classes for light and dark themes */
  badgeClass: string
  /** Dot / indicator color */
  dotClass: string
}

export const STAGE_CONFIG: Record<LeadStage, StageDefinition> = {
  new: {
    stage: 'new',
    label: 'ליד חדש',
    badgeClass: 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border-stone-500/30 hover:bg-stone-500/20',
    dotClass: 'bg-stone-400',
  },
  intake: {
    stage: 'intake',
    label: 'איסוף פרטים',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20',
    dotClass: 'bg-blue-500',
  },
  awaiting_price: {
    stage: 'awaiting_price',
    label: 'ממתין להצעת מחיר',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20',
    dotClass: 'bg-indigo-500',
  },
  awaiting_payment: {
    stage: 'awaiting_payment',
    label: 'ממתין למקדמה',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  booked: {
    stage: 'booked',
    label: 'נקבע תור',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
  expired: {
    stage: 'expired',
    label: 'פג תוקף',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20',
    dotClass: 'bg-rose-500',
  },
}

export const STAGE_OPTIONS: StageDefinition[] = Object.values(STAGE_CONFIG)

/** Kept for backward compatibility with any column-keyed references */
export const COLUMNS: { stage: LeadStage; label: string; color: string }[] = STAGE_OPTIONS.map((s) => ({
  stage: s.stage,
  label: s.label,
  color: s.badgeClass,
}))

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
