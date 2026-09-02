import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { LeadsPage } from '@/features/leads/components/LeadsPage'

const dashboardRoute = getRouteApi('/dashboard')

export const Route = createFileRoute('/dashboard/leads')({
  component: RouteComponent,
})

function RouteComponent() {
  const session = dashboardRoute.useLoaderData()
  if (!session) return null

  return <LeadsPage staff={session.staff} />
}
