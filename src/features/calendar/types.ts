export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export interface ApiAppointment {
  id: string
  customerId: string
  chatId: string | null
  staffId: string | null
  date: string
  timeSlot: string
  status: AppointmentStatus
  createdAt: string
  leadName: string | null
  leadPhone: string | null
  staffName: string | null
  style: string | null
  priceMin: number | null
  priceMax: number | null
  depositAmount: number | null
  hasDeposit: boolean
  durationMinutes: number
  slotConfirmed: boolean
  notes: string | null
  isException: boolean
  source: 'ai_bot' | 'staff_manual'
  referenceImages?: string[]
}

export interface AppointmentFormValues {
  customerId: string | null
  chatId: string | null
  leadName: string
  leadPhone: string
  date: string
  timeSlot: string
  staffId: string | null
  durationMinutes: number
  tattooDescription: string
  priceMinIls: number | null
  priceMaxIls: number | null
  depositAmount: number | null
  status: AppointmentStatus
  depositPaid: boolean
  notes: string
  allowException: boolean
  referenceImages?: string[]
}

export interface ApiLead {
  chatId: string
  name: string | null
  phone: string | null
  stage: string
}

export interface ApiExternalBusyPeriod {
  staffId: string
  googleEventId: string
  startsAt: string
  endsAt: string
}

export interface ApiGoogleConnection {
  staffId: string
  googleAccountEmail: string | null
  googleAccountPicture: string | null
  status: 'connected' | 'disconnected' | 'error'
  lastError: string | null
  lastSyncedAt: string | null
}

export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
  cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
  no_show: 'bg-stone-800 text-stone-400 border-stone-800 hover:bg-stone-800/80',
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'ממתין לאישור',
  confirmed: 'מאושר',
  completed: 'הושלם',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
}
