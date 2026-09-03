import { timingSafeEqual } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { runLifecycleTick } from '@/features/lifecycle/server/lifecycle-service'

function isValidHookSecret(headerValue: string | null): boolean {
  const expected = process.env.PB_HOOK_SECRET ?? ''
  if (!expected || !headerValue) return false
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(headerValue)
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

export async function handleLifecycleTick(request: Request): Promise<Response> {
  if (!isValidHookSecret(request.headers.get('x-pb-hook-secret'))) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const su = await getSuperuserClient()
    const result = await runLifecycleTick(su)
    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[lifecycle-tick] error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const Route = createFileRoute('/api/internal/lifecycle-tick')({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => handleLifecycleTick(request),
    },
  },
})

// Auto-start periodic background runner on server runtime (guarded against test environments)
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
  import('@/features/lifecycle/server/lifecycle-runner')
    .then((m) => {
      m.startLifecycleRunner()
    })
    .catch(() => null)
}
