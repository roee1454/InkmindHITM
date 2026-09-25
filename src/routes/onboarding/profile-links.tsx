import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/profile-links')({
  beforeLoad: () => {
    throw redirect({ to: '/onboarding' })
  },
  component: () => null,
})
