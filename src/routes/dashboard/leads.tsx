import { createFileRoute } from '@tanstack/react-router'
import { getCurrentSession } from '@/features/auth/server/auth'
import { LeadsBoardPage } from '@/features/leads/components/LeadsBoardPage'

export const Route = createFileRoute('/dashboard/leads')({
  loader: () => getCurrentSession(),
  component: RouteComponent,
})

function RouteComponent() {
  const session = Route.useLoaderData()
  // Unreachable in practice: /dashboard's beforeLoad already redirects unauthenticated
  // visitors to /auth/login before this route's own loader ever runs.
  if (!session) return null

  return (
    <div className="w-full max-w-5xl mx-auto h-[calc(100svh-7.5rem)] space-y-6 font-assistant py-6" dir="rtl">
      <LeadsBoardPage staff={session.staff} />
    </div>
  )
}
