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

export const SOURCE_BADGE_STYLES: Record<string, string> = {
  instagram: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  tiktok: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  facebook: 'bg-blue-600/15 text-blue-400 border-blue-600/30',
  google: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  website: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  referral: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'walk-in': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  unknown: 'bg-muted/40 text-muted-foreground border-border/60',
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
