import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BrandMark } from '@/components/BrandMark'
import { needsBootstrap } from '@/features/auth/server/auth'
import { studioConfig } from '@/config/studio.config'
import { useOnboardingUiStore } from '../store/onboardingUiStore'

export function StudioStep() {
  const nextStep = useOnboardingUiStore((s) => s.nextStep)
  const setCurrentStep = useOnboardingUiStore((s) => s.setCurrentStep)

  const { data: isBootstrapping = true } = useQuery({
    queryKey: ['needs-bootstrap'],
    queryFn: () => needsBootstrap(),
  })

  function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!isBootstrapping) {
      setCurrentStep(3)
    } else {
      nextStep()
    }
  }

  return (
    <form onSubmit={handleContinue} className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">ברוכים הבאים ל-{studioConfig.studioName}</h1>
        <p className="step-hint">הגדרת המערכת והפעלת סוכן ההזמנות האוטומטי.</p>
      </div>

      <div className="card-native flex flex-col items-center gap-4 p-8 text-center">
        <BrandMark size="lg" />
        <div className="flex flex-col gap-1">
          <span className="text-xl font-extrabold text-foreground">{studioConfig.studioName}</span>
          {studioConfig.tagline && (
            <span className="text-sm text-muted-foreground">{studioConfig.tagline}</span>
          )}
          {studioConfig.address && (
            <span className="text-xs text-muted-foreground">{studioConfig.address}</span>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="step-footer">
        <button type="submit" className="btn-native">
          {isBootstrapping ? 'המשך לפתיחת משתמש מנהל' : 'המשך להגדרת פרופיל'}
        </button>
      </div>
    </form>
  )
}
