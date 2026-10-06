import { useEffect } from 'react'
import { OnboardingStepShell } from '@/components/OnboardingStepShell'
import { useInviteUiStore } from './store/inviteUiStore'
import { InviteInvalidToken } from './components/InviteInvalidToken'
import { Step1Credentials } from './components/Step1Credentials'
import { Step2Profile } from './components/Step2Profile'
import { Step3WorkHours } from './components/Step3WorkHours'
import { Step4GoogleCalendar } from './components/Step4GoogleCalendar'
import type { VerifyStaffInviteResult } from './types'

interface InvitePageProps {
  token: string
  loaderData: VerifyStaffInviteResult
}

export function InvitePage({ token, loaderData }: InvitePageProps) {
  const currentStep = useInviteUiStore((s) => s.currentStep)
  const setCurrentStep = useInviteUiStore((s) => s.setCurrentStep)
  const init = useInviteUiStore((s) => s.init)

  useEffect(() => {
    if (loaderData?.valid) {
      init(loaderData.staff.id, loaderData.staff.name, token)
    }
  }, [loaderData, token, init])

  if (!loaderData?.valid) {
    return <InviteInvalidToken reason={loaderData?.reason} />
  }

  const handleBack =
    currentStep > 1 && currentStep !== 2
      ? () => setCurrentStep((currentStep - 1) as 2 | 3)
      : undefined

  return (
    <OnboardingStepShell
      stepNumber={currentStep}
      totalSteps={4}
      onBack={handleBack}
      headline="כמה שאלות קצרות, והפרופיל שלך מוכן לעבודה"
      benefits={[
        'הגדרת סיסמה ושעות פעילות אישיות',
        'סנכרון יומן Google למניעת התנגשויות',
        'פרטי הגישה שלך מאובטחים לחלוטין',
      ]}
    >
      {currentStep === 1 && <Step1Credentials />}
      {currentStep === 2 && <Step2Profile />}
      {currentStep === 3 && <Step3WorkHours />}
      {currentStep === 4 && <Step4GoogleCalendar />}
    </OnboardingStepShell>
  )
}

