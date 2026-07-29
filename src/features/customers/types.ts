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
}

export const SOURCE_LABELS: Record<string, string> = {
  instagram: 'אינסטגרם',
  facebook: 'פייסבוק',
  google: 'גוגל',
  website: 'אתר',
  referral: 'המלצה',
  'walk-in': 'ווק-אין',
  unknown: 'לא ידוע',
}

export const AVATAR_COLORS = [
  'bg-pink-500/10 text-pink-400 border-pink-500/25',
  'bg-purple-500/10 text-purple-400 border-purple-500/25',
  'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
  'bg-blue-500/10 text-blue-400 border-blue-500/25',
  'bg-teal-500/10 text-teal-400 border-teal-500/25',
]

export interface CustomerFormData {
  name: string
  phone: string
  email: string
  source: string
  isVip: boolean
}
