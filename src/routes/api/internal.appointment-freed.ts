import { timingSafeEqual } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { runWaitlistMatching } from '@/features/mcp-assistant/server/waitlist-matcher'

/** Same constant-time shared-secret check as `internal.appointment-sync.ts` — this is called by
 *  `pocketbase/pb_hooks/appointments.pb.js` whenever an appointment's status becomes `cancelled`
 *  or gets deleted, so it must reject requests that don't know the secret. */
function isValidHookSecret(headerValue: string | null): boolean {
  const expected = process.env.PB_HOOK_SECRET ?? ''
  if (!expected || !headerValue) return false
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(headerValue)
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

type FreedPayload = { event: 'update'; appointmentId: string }

/**
 * Internal callback target for the `appointments` PocketBase hook — reacts to an appointment's
 * status becoming `cancelled` by running the earlier-slot waitlist matcher. Not meant to be
 * called by anything except that hook; see `pocketbase/pb_hooks/appointments.pb.js` for the
 * caller and `src/features/mcp-assistant/server/waitlist-matcher.ts` for the matching logic.
 *
 * Deliberately update-only, not hard-delete — a matched offer needs to reference the freed slot
 * (`waitlist_entries.offered_appointment`, a relation) all the way through to the eventual
 * booking step, which requires the appointment record to still exist. A hard-deleted appointment
 * has nothing left to reference, and per research, hard delete is a rare staff-UI-only action
 * (normal cancellations soft-cancel via `status`) — not worth the extra complexity of carrying
 * the slot's date/time/duration as bare fields instead of a real relation for v1.
 */
export async function handleAppointmentFreed(request: Request): Promise<Response> {
  if (!isValidHookSecret(request.headers.get('x-pb-hook-secret'))) {
    return new Response('Forbidden', { status: 403 })
  }

  let payload: FreedPayload
  try {
    payload = (await request.json()) as FreedPayload
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  try {
    const su = await getSuperuserClient()
    const appointment = await su.collection('appointments').getOne(payload.appointmentId).catch(() => null)
    // Defense in depth — the pb_hook only calls this endpoint when it just saw `status`
    // transition to `cancelled`, but re-check here too in case that gate is ever loosened.
    if (!appointment || appointment.status !== 'cancelled') return new Response('OK', { status: 200 })
    await runWaitlistMatching({
      id: appointment.id,
      staff: (appointment.staff as string) || null,
      startTime: appointment.start_time as string,
      durationMinutes: Number(appointment.duration_minutes) || 120,
    })
  } catch (err) {
    console.error('[appointment-freed] unexpected error', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

export const Route = createFileRoute('/api/internal/appointment-freed')({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => handleAppointmentFreed(request),
    },
  },
})
