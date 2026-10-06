/** Single source of truth for the guided onboarding flow (7 steps overall) */
export type OnboardingStepId =
  | 'studio'
  | 'admin'
  | 'profile-links'
  | 'hours'
  | 'payments'
  | 'calendar'
  | 'team'

export interface OnboardingStep {
  id: OnboardingStepId
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7
  title: string
}

export const TOTAL_ONBOARDING_STEPS = 7

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'studio', stepNumber: 1, title: 'פרטי הסטודיו ולוגו' },
  { id: 'admin', stepNumber: 2, title: 'יצירת חשבון מנהל' },
  { id: 'profile-links', stepNumber: 3, title: 'תיק עבודות ופרופיל אמן' },
  { id: 'hours', stepNumber: 4, title: 'שעות פעילות שבועיות' },
  { id: 'payments', stepNumber: 5, title: 'אמצעי תשלום ומקדמה' },
  { id: 'calendar', stepNumber: 6, title: 'חיבור יומן Google' },
  { id: 'team', stepNumber: 7, title: 'הזמנת חברי צוות וסיום' },
]

export function getStepByNumber(stepNumber: number): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((s) => s.stepNumber === stepNumber)
}

export function progressPercent(stepNumber: number): number {
  return Math.min(100, Math.round((stepNumber / TOTAL_ONBOARDING_STEPS) * 100))
}
