import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/settings/policy')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/settings/ai', search: { sub: 'policy' }, replace: true })
  },
  component: () => null,
})
