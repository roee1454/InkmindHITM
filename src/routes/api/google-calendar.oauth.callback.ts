import { createFileRoute } from '@tanstack/react-router'
import {
  unpackOAuthState,
  exchangeCode,
  saveGoogleCredentials,
} from '@/integrations/google-calendar/server/google-auth'
import { syncAllConfirmedAppointmentsForStaff } from '@/integrations/google-calendar/server/google-sync'

function popupResultHtml(payload: { success: boolean; error?: string }, targetOrigin: string): string {
  return `<!DOCTYPE html><html><body><script>
    if (window.opener) {
      window.opener.postMessage(${JSON.stringify({ type: 'google-calendar-oauth-result', ...payload })}, ${JSON.stringify(targetOrigin)});
    }
    window.close();
  </script></body></html>`
}

export async function handleCallbackGet(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const fallbackOrigin = url.origin

  if (error || !code || !state) {
    const html = popupResultHtml({ success: false, error: error || 'missing_code' }, fallbackOrigin)
    return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  }

  const unpacked = unpackOAuthState(state)
  if (!unpacked) {
    const html = popupResultHtml({ success: false, error: 'invalid_state' }, fallbackOrigin)
    return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  }

  const { staffId, origin } = unpacked
  try {
    const tokens = await exchangeCode(code)
    await saveGoogleCredentials(staffId, tokens)
    await syncAllConfirmedAppointmentsForStaff(staffId)

    const html = popupResultHtml({ success: true }, origin)
    return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  } catch (err: unknown) {
    console.error('[google-oauth-callback] error during exchange:', err)
    const html = popupResultHtml(
      { success: false, error: err instanceof Error ? err.message : 'exchange_failed' },
      origin,
    )
    return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  }
}

export const Route = createFileRoute('/api/google-calendar/oauth/callback')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handleCallbackGet(request),
    },
  },
})
