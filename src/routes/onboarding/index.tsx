import { createFileRoute } from '@tanstack/react-router'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingPage,
})

