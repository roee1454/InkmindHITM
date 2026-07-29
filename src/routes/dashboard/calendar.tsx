import { createFileRoute } from '@tanstack/react-router'
import { CalendarPage } from '@/features/calendar/CalendarPage'

export const Route = createFileRoute('/dashboard/calendar')({
  component: CalendarPage,
})
