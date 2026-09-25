import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/studio')({
  beforeLoad: () => {
    throw redirect({ to: '/onboarding' })
  },
  component: () => null,
})
