import type { CustomerLifecycle } from './utils/lifecycle'
import type { LedgerPayment } from '@/features/payments/types'
import type { PipelineProject } from '@/features/projects/types'

export interface Customer {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  source: string | null
  isVip: boolean
  chatId?: string | null
  createdAt: string
  updatedAt: string
  visits: number
  totalSpend: number
  lifecycle: CustomerLifecycle
  healthDeclarationSigned?: boolean
  healthDeclarationDate?: string | null
  healthDeclarationUrl?: string | null
  allergies?: string | null
  medicalNotes?: string | null
  healthDeclarationAnswers?: Record<string, string | number | boolean | null | string[]> | null
}

export type CustomerSource =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'google'
  | 'website'
  | 'referral'
  | 'walk-in'
  | 'unknown'

export const SOURCE_LABELS: Record<string, string> = {
  instagram: 'אינסטגרם',
  tiktok: 'טיקטוק',
  facebook: 'פייסבוק',
  google: 'גוגל',
  website: 'אתר',
  referral: 'המלצה / מפה לאוזן',
  'walk-in': 'ווק-אין / סטודיו',
  unknown: 'לא ידוע',
}

/** Categorical, like the artist ramp — it distinguishes people, never state. Drawn from
 *  the theme's identity ramp so it stays legible on both grounds. */
export const AVATAR_COLORS = [
  'bg-artist-1/12 text-artist-1 border-artist-1/25',
  'bg-artist-2/12 text-artist-2 border-artist-2/25',
  'bg-artist-4/12 text-artist-4 border-artist-4/25',
  'bg-artist-5/12 text-artist-5 border-artist-5/25',
  'bg-artist-7/12 text-artist-7 border-artist-7/25',
]

export interface CustomerFormData {
  name: string
  phone: string
  email: string
  source: string
  isVip: boolean
  healthDeclarationSigned?: boolean
  healthDeclarationDate?: string | null
  healthDeclarationUrl?: string | null
  allergies?: string | null
  medicalNotes?: string | null
  healthDeclarationAnswers?: Record<string, string | number | boolean | null | string[]> | null
}

/** One payment as the customer card lists it: the ledger row plus which piece it paid for. */
export interface CustomerPaymentRow extends LedgerPayment {
  projectId: string
  projectTitle: string
  /** When it was recorded; the row's date when nobody entered `receivedAt`. */
  createdAt: string
}

/** The customer card's projects and money tabs (track-b B8.1). */
export interface CustomerOverview {
  conversationId: string | null
  projects: PipelineProject[]
  payments: CustomerPaymentRow[]
  totals: {
    /** Verified deposits and payments, net of verified refunds. */
    paid: number
    due: number
    credit: number
    /** Receipts the customer sent that nobody checked yet. */
    awaitingVerification: number
  }
}
