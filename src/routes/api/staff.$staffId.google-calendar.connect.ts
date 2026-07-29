import { createFileRoute } from '@tanstack/react-router'
import { getAuthUrl, packOAuthState } from '@/integrations/google-calendar/server/google-auth'

export async function handleConnectGet(request: Request, params: { staffId: string }): Promise<Response> {
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
