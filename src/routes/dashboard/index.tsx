import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { DashboardHomePage } from '#/features/dashboard/DashboardPage'

const dashboardRoute = getRouteApi('/dashboard')

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndexRoute,
})

function DashboardIndexRoute() {
  const session = dashboardRoute.useLoaderData()
  return <DashboardHomePage staffName={session?.staff.name} />
}
