import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/setup')({
  beforeLoad: () => {
    throw redirect({ to: '/onboarding' })
  },
  component: () => null,
})
