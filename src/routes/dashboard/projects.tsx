import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ProjectsPage } from '@/features/projects/ProjectsPage'

const dashboardRoute = getRouteApi('/dashboard')

export const Route = createFileRoute('/dashboard/projects')({
  component: RouteComponent,
})

function RouteComponent() {
  const session = dashboardRoute.useLoaderData()
  if (!session) return null

  return <ProjectsPage staff={session.staff} />
}
