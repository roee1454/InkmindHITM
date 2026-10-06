import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/done')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
  component: () => null,
})
