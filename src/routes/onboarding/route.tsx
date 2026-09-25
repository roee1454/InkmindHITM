import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentSession, needsBootstrap } from '@/features/auth/server/auth'
import { getSettings } from '@/features/onboarding/server/onboarding'
import { ConfirmProvider } from '#/hooks/useConfirm'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const isBootstrapping = await needsBootstrap()
    if (!isBootstrapping) {
      const session = await getCurrentSession()
      if (!session) throw redirect({ to: '/auth/login' })
    }
    const settings = await getSettings()
    if (settings?.onboarding_completed) throw redirect({ to: '/dashboard' })
  },
  component: OnboardingRouteLayout,
})

function OnboardingRouteLayout() {
  return (
    <ConfirmProvider>
      <Outlet />
    </ConfirmProvider>
  )
}
