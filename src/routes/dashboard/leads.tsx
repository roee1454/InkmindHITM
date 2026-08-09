import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { LeadsBoardPage } from '@/features/leads/components/LeadsBoardPage'

const dashboardRoute = getRouteApi('/dashboard')

export const Route = createFileRoute('/dashboard/leads')({
  component: RouteComponent,
})

function RouteComponent() {
  const session = dashboardRoute.useLoaderData()
  // Unreachable in practice: /dashboard's beforeLoad already redirects unauthenticated
  // visitors to /auth/login before this route's own loader ever runs.
  if (!session) return null

  return (
    // `flex-1 min-h-0` instead of the old h-[calc(100svh-7.5rem)]: .page-container is now a
    // flex column, so the board fills whatever height is left with no magic number coupling
    // it to that element's padding. `gap-3` rather than `space-y-*` — margin-based spacing
    // interacts badly with a `flex-1` child.
    <div
      className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3 py-3 font-assistant md:gap-6 md:py-6"
      dir="rtl"
    >
      <LeadsBoardPage staff={session.staff} />
    </div>
  )
}
