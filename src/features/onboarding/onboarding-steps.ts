/** Single source of truth for the 3-step onboarding flow — the route shell (`route.tsx`) and
 *  every step read from this instead of hardcoding their position. */
export interface OnboardingStep {
  id: 'studio' | 'hours' | 'profile-links'
  route: string
  required: true
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'studio', route: '/onboarding/studio', required: true },
  { id: 'hours', route: '/onboarding/hours', required: true },
  { id: 'profile-links', route: '/onboarding/profile-links', required: true },
]

export function stepIndex(pathname: string): number {
  return ONBOARDING_STEPS.findIndex((s) => s.route === pathname)
}

export function nextStep(pathname: string): OnboardingStep | undefined {
  const idx = stepIndex(pathname)
  return idx >= 0 ? ONBOARDING_STEPS[idx + 1] : undefined
}

export function previousStep(pathname: string): OnboardingStep | undefined {
  const idx = stepIndex(pathname)
  return idx > 0 ? ONBOARDING_STEPS[idx - 1] : undefined
}

export function progressPercent(pathname: string): number {
  const idx = stepIndex(pathname)
  if (idx < 0) return 0
  return Math.round(((idx + 1) / ONBOARDING_STEPS.length) * 100)
}
