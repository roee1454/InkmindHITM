import { z } from 'zod'
import type { WorkingHoursWindow } from '@/features/settings/server/settings'
import type { HOURS_PRESETS } from '@/features/onboarding/utils/work-hours'

export type InviteStep = 1 | 2 | 3 | 4

export type InviteTokenStatus = 'not_found' | 'already_accepted' | 'expired' | 'missing_token'

export type VerifyStaffInviteResult =
  | {
      valid: true
      staff: {
        id: string
        name: string
        email: string
        role: string
      }
    }
  | {
      valid: false
      reason: InviteTokenStatus
    }

export const inviteSearchSchema = z.object({
  token: z.string().catch('').default(''),
})

export type InviteSearch = z.infer<typeof inviteSearchSchema>

export const acceptStaffInviteSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
    passwordConfirm: z.string().min(8, 'אימות הסיסמה חייב להכיל לפחות 8 תווים'),
    phone: z.string().trim().min(9, 'נא להזין מספר טלפון תקין'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'הסיסמאות אינן תואמות',
    path: ['passwordConfirm'],
  })

export type AcceptStaffInviteInput = z.infer<typeof acceptStaffInviteSchema>

export type PresetKey = keyof typeof HOURS_PRESETS

export const DAY_CHIPS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'] as const

export interface InviteUiState {
  currentStep: InviteStep
  staffId: string
  staffName: string
  token: string

  // Step 1: Password & Phone
  password: string
  passwordConfirm: string
  phone: string
  showPassword: boolean
  showPasswordConfirm: boolean
  step1Errors: Record<string, string>
  step1RootError: string | null

  // Step 2: Artist Profile
  portfolioUrl: string
  bio: string
  profileError: string | null

  // Step 3: Work Hours
  windows: WorkingHoursWindow[]
  selectedPreset: PresetKey
  showHoursDetail: boolean
  hoursError: string | null

  // Step 4: Google Calendar OAuth
  connectingCalendar: boolean
  calendarError: string | null

  // Actions
  init: (staffId: string, staffName: string, token: string) => void
  setCurrentStep: (step: InviteStep) => void
  setStaffId: (id: string) => void
  setPassword: (password: string) => void
  setPasswordConfirm: (passwordConfirm: string) => void
  setPhone: (phone: string) => void
  setShowPassword: (show: boolean) => void
  setShowPasswordConfirm: (show: boolean) => void
  setStep1Errors: (errors: Record<string, string>) => void
  setStep1RootError: (error: string | null) => void
  setPortfolioUrl: (url: string) => void
  setBio: (bio: string) => void
  setProfileError: (error: string | null) => void
  setWindows: (windows: WorkingHoursWindow[]) => void
  setSelectedPreset: (preset: PresetKey) => void
  setShowHoursDetail: (show: boolean | ((prev: boolean) => boolean)) => void
  setHoursError: (error: string | null) => void
  setConnectingCalendar: (connecting: boolean) => void
  setCalendarError: (error: string | null) => void
  toggleDay: (dayOfWeek: number) => void
  applyPreset: (preset: PresetKey) => void
  reset: () => void
}

