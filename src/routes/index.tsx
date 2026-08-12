import { createFileRoute, redirect } from '@tanstack/react-router'
import { needsBootstrap, getCurrentSession } from '@/features/auth/server/auth'
import { getSettings } from '@/features/onboarding/server/onboarding'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (await needsBootstrap()) {
      throw redirect({ to: '/auth/setup' })
    }
    const session = await getCurrentSession()
    if (!session) {
      throw redirect({ to: '/auth/login' })
    }
    const settings = await getSettings()
    if (!settings?.onboarding_completed) {
      throw redirect({ to: '/onboarding/studio' })
    }
    throw redirect({ to: '/dashboard' })
  },
})
