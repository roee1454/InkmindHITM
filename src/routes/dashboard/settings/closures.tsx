import { createFileRoute } from '@tanstack/react-router'
import { ClosuresTab } from '@/features/settings/tabs/closures/ClosuresTab'

export const Route = createFileRoute('/dashboard/settings/closures')({
  component: ClosuresTab,
})
