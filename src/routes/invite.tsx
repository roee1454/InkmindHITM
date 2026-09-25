import { createFileRoute } from '@tanstack/react-router'
import { verifyStaffInviteToken } from '@/features/invite/server/invite'
import { inviteSearchSchema } from '@/features/invite/types'
import { InvitePage } from '#/features/invite/InvitePage'

export const Route = createFileRoute('/invite')({
  validateSearch: (search) => inviteSearchSchema.parse(search),
  loaderDeps: ({ search: { token } }) => ({ token }),
  loader: async ({ deps: { token } }) => {
    if (!token) return { valid: false as const, reason: 'missing_token' as const }
    return verifyStaffInviteToken({ data: { token } })
  },
  component: InviteRouteComponent,
})

function InviteRouteComponent() {
  const { token } = Route.useSearch()
  const loaderData = Route.useLoaderData()

  return <InvitePage token={token} loaderData={loaderData} />
}
