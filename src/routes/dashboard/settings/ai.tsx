import { createFileRoute } from '@tanstack/react-router'
import { AITab } from '@/features/settings/tabs/ai/AITab'

export const Route = createFileRoute('/dashboard/settings/ai')({
  component: AITab,
})
