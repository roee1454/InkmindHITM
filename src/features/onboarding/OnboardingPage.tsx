import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { OnboardingStepShell } from '@/components/OnboardingStepShell'
import { getCurrentSession, needsBootstrap } from '@/features/auth/server/auth'
import { useOnboardingUiStore } from './store/onboardingUiStore'
import { StudioStep } from './components/StudioStep'
import { AdminStep } from './components/AdminStep'
import { ProfileLinksStep } from './components/ProfileLinksStep'
import { HoursStep } from './components/HoursStep'
import { PaymentsStep } from './components/PaymentsStep'
import { CalendarStep } from './components/CalendarStep'

export function OnboardingPage() {
  const currentStep = useOnboardingUiStore((s) => s.currentStep)
  const setCurrentStep = useOnboardingUiStore((s) => s.setCurrentStep)
  const prevStep = useOnboardingUiStore((s) => s.prevStep)

  const { data: session } = useQuery({
    queryKey: ['current-session'],
    queryFn: () => getCurrentSession(),
  })

  const { data: isBootstrapping = false } = useQuery({
    queryKey: ['needs-bootstrap'],
    queryFn: () => needsBootstrap(),
  })

  // If user is already logged in (bootstrap already completed) and at step 2, skip to step 3
  useEffect(() => {
    if (!isBootstrapping && session && currentStep === 2) {
      setCurrentStep(3)
    }
  }, [isBootstrapping, session, currentStep, setCurrentStep])

  const handleBack = () => {
    if (currentStep <= 1) return
    if (currentStep === 2) {
      prevStep()
      return
    }
    if (currentStep === 3) {
      // If bootstrapping is false (admin already exists), back goes to Step 1 (Studio)
      if (!isBootstrapping) {
        setCurrentStep(1)
      } else {
        prevStep()
      }
      return
    }
    prevStep()
  }

  return (
    <OnboardingStepShell
      stepNumber={currentStep}
      totalSteps={6}
      onBack={currentStep > 1 ? handleBack : undefined}
      headline={'כמה שאלות קצרות,\nוהבוט שלך מוכן\nלעבודה'}
      benefits={[
        'הגדרת סטודיו ויצירת חשבון מנהל',
        'התאמת שעות עבודה, פרופיל ואמצעי תשלום',
        'סנכרון יומן Google ומניעת התנגשויות תורים',
      ]}
    >
      {currentStep === 1 && <StudioStep />}
      {currentStep === 2 && <AdminStep />}
      {currentStep === 3 && <ProfileLinksStep session={session} />}
      {currentStep === 4 && <HoursStep session={session} />}
      {currentStep === 5 && <PaymentsStep />}
      {currentStep === 6 && <CalendarStep session={session} />}
    </OnboardingStepShell>
  )
}

export default OnboardingPage

