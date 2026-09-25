import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/hours')({
  beforeLoad: () => {
    throw redirect({ to: '/onboarding' })
  },
  component: () => null,
})
