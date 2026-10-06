import { createFileRoute } from '@tanstack/react-router'

export async function handleConnectGet(request: Request, params: { staffId: string }): Promise<Response> {
  const { createRequestClient } = await import('@/integrations/pocketbase/superuser.server')
  const { getAuthUrl, packOAuthState } = await import('@/integrations/google-calendar/server/google-auth.server')

  const cookie = request.headers.get('cookie')
  const client = createRequestClient(cookie)
  if (!client.authStore.isValid || !client.authStore.record) {
    return new Response('Unauthorized: Login required', { status: 401 })
  }

  const staff = client.authStore.record as { id: string; role?: string }
  const isOwnerOrAdmin = staff.role === 'owner' || staff.role === 'admin'
  if (staff.id !== params.staffId && !isOwnerOrAdmin) {
    return new Response('Forbidden: Cannot connect calendar for other staff', { status: 403 })
  }

  const referer = request.headers.get('referer')
  const origin = referer ? new URL(referer).origin : new URL(request.url).origin

  const state = packOAuthState(params.staffId, origin)
  const authUrl = getAuthUrl(state)

  return Response.redirect(authUrl, 302)
}

export const Route = createFileRoute('/api/staff/$staffId/google-calendar/connect')({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: { staffId: string } }) =>
        handleConnectGet(request, params),
    },
  },
})
