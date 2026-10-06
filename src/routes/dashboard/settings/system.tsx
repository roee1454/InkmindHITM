import { createFileRoute } from '@tanstack/react-router'
import { SystemTab } from '@/features/settings/tabs/system/SystemTab'

export const Route = createFileRoute('/dashboard/settings/system')({
  component: SystemTab,
})
