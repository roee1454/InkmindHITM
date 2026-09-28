import { createFileRoute } from '@tanstack/react-router'
import { GeneralTab } from '@/features/settings/tabs/general/GeneralTab'

export const Route = createFileRoute('/dashboard/settings/general')({
  component: GeneralTab,
})
