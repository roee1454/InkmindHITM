import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'

const notificationsSearchSchema = z.object({
  highlightId: z.string().optional(),
})

export const Route = createFileRoute('/dashboard/notifications')({
  validateSearch: notificationsSearchSchema,
  component: NotificationsRouteComponent,
})

function NotificationsRouteComponent() {
  const { highlightId } = Route.useSearch()
  return <NotificationsPage highlightId={highlightId} />
}
