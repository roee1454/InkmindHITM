import { createFileRoute } from '@tanstack/react-router'
import { PolicyTab } from '@/features/settings/tabs/policy/PolicyTab'

export const Route = createFileRoute('/dashboard/settings/policy')({
  component: PolicyTab,
})
