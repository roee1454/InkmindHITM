import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getSettings } from '@/features/onboarding/server/onboarding'
import { ConfirmProvider } from '@/hooks/use-confirm'
import { ONBOARDING_STEPS, nextStep, previousStep, progressPercent, stepIndex } from '@/features/onboarding/onboarding-steps'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/auth/login' })
    const settings = await getSettings()
    if (settings?.onboarding_completed) throw redirect({ to: '/dashboard' })
  },
  component: OnboardingLayout,
})

function OnboardingLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const idx = stepIndex(pathname)
  const back = previousStep(pathname)
  const skipTarget = nextStep(pathname)

  return (
    <ConfirmProvider>
      <div className="step-shell font-assistant" dir="rtl">
        <div className="step-progress">
          <div className="step-progress-fill" style={{ width: `${progressPercent(pathname)}%` }} />
        </div>

        <div className="flex h-[52px] shrink-0 items-center justify-between px-4">
          {back ? (
            <button
              type="button"
              onClick={() => navigate({ to: back.route })}
              aria-label="חזרה"
              className="tap-target text-foreground"
            >
              <ChevronRight size={22} />
            </button>
          ) : (
            <div className="size-11" />
          )}

          <span className="text-[14px] font-bold text-muted-foreground">
            {idx >= 0 ? idx + 1 : 1} מתוך {ONBOARDING_STEPS.length}
          </span>

          {skipTarget ? (
            <button
              type="button"
              onClick={() => navigate({ to: skipTarget.route })}
              className="cursor-pointer text-[14.5px] font-bold text-muted-foreground"
            >
              דלג
            </button>
          ) : (
            <div className="size-11" />
          )}
        </div>

        <Outlet />
      </div>
    </ConfirmProvider>
  )
}
