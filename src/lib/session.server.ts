import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import { createRequestClient } from '@/integrations/pocketbase/superuser.server'
import type { StaffRecord } from '@/integrations/pocketbase/types'

const isProd = process.env.NODE_ENV === 'production'

/** Server-only: builds a Pocketbase client scoped to the current request's session. */
export function getSessionClient() {
  return createRequestClient(getRequestHeader('cookie'))
}

/** Server-only: writes the client's current auth state (or clears it) to the response cookie. */
export function persistSessionCookie(client: ReturnType<typeof createRequestClient>) {
  const cookie = client.authStore.exportToCookie({
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  })
  setResponseHeader('set-cookie', cookie)
}

export function clearSessionCookie(client: ReturnType<typeof createRequestClient>) {
  client.authStore.clear()
  persistSessionCookie(client)
}

export interface Session {
  staff: StaffRecord
}

/** Server-only: returns the current session, or null if unauthenticated/expired. */
export async function getSession(): Promise<Session | null> {
  const client = getSessionClient()
  if (!client.authStore.isValid || !client.authStore.record) return null

  try {
    await client.collection('staff').authRefresh()
  } catch {
    return null
  }
  return { staff: client.authStore.record as unknown as StaffRecord }
}
