export type LeadStage =
  | 'new'
  | 'intake'
  | 'awaiting_price'
  | 'awaiting_payment'
  | 'booked'
  | 'expired'

/** Fixed 6-column board, ported verbatim from WAHA's `COLUMNS` — always rendered in full
 *  regardless of what stages actually appear in the data. Text shade bumped from WAHA's
 *  dark-theme `-400` to `-600`: inkmind's tokens are a light theme, so `-400` text on a
 *  ~10%-opacity light tint would be nearly invisible. Same six hues otherwise. */
export const COLUMNS: { stage: LeadStage; label: string; color: string }[] = [
  { stage: 'new', label: 'ליד חדש', color: 'bg-stone-500/10 text-stone-600 border-stone-500/20' },
  { stage: 'intake', label: 'איסוף פרטים', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  {
    stage: 'awaiting_price',
    label: 'ממתין להצעת מחיר',
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  },
  {
    stage: 'awaiting_payment',
    label: 'ממתין למקדמה',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  { stage: 'booked', label: 'נקבע תור', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { stage: 'expired', label: 'פג תוקף', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
]

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
