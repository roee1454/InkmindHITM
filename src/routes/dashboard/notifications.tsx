import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import type { NotificationsTab } from '@/features/notifications/NotificationsPage'

const notificationsSearchSchema = z.object({
  highlightId: z.string().optional(),
  tab: z.enum(['system', 'whatsapp']).optional(),
})

export const Route = createFileRoute('/dashboard/notifications')({
  validateSearch: notificationsSearchSchema,
  component: NotificationsRouteComponent,
})

function NotificationsRouteComponent() {
  const { highlightId, tab } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return <NotificationsPage highlightId={highlightId} tab={tab} onTabChange={(next: NotificationsTab) => navigate({ search: { tab: next }, replace: true })} />
}
