import { timingSafeEqual } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import type { RecordModel } from 'pocketbase'
import {
  syncAppointmentToGoogle,
  deleteSyncedAppointmentFromGoogle,
} from '@/integrations/google-calendar/server/google-sync'

/** Constant-time shared-secret check — same rationale as the WhatsApp webhook's HMAC check
 *  (src/routes/api/whatsapp-webhook.ts): this is called by pocketbase/pb_hooks/appointments.pb.js
 *  after every appointments write, so it must reject requests that don't know the secret. */
function isValidHookSecret(headerValue: string | null): boolean {
  const expected = process.env.PB_HOOK_SECRET ?? ''
  if (!expected || !headerValue) return false
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(headerValue)
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

type SyncPayload =
  | { event: 'create' | 'update'; appointmentId: string }
  | { event: 'delete'; record: { staff: string | null; google_event_id: string | null } }

/**
 * Internal callback target for the `appointments` PocketBase hooks — guarantees Google
 * Calendar sync fires no matter which Node code path (dashboard, AI agent, future MCP tools)
 * wrote the appointment. Not meant to be called by anything except that hook; see
 * pocketbase/pb_hooks/appointments.pb.js for the caller and CLAUDE.md/the appointment-sync
 * plan for the full rationale.
 */
export async function handleAppointmentSync(request: Request): Promise<Response> {
  if (!isValidHookSecret(request.headers.get('x-pb-hook-secret'))) {
    return new Response('Forbidden', { status: 403 })
  }

  let payload: SyncPayload
  try {
    payload = (await request.json()) as SyncPayload
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  try {
    switch (payload.event) {
      case 'create':
      case 'update':
        await syncAppointmentToGoogle(payload.appointmentId)
        break
      case 'delete': {
        // Minimal RecordModel — deleteSyncedAppointmentFromGoogle only reads staff/google_event_id;
        // id/collectionId/collectionName are unused placeholders required by the type.
        const record: RecordModel = {
          id: '',
          collectionId: '',
          collectionName: 'appointments',
          staff: payload.record.staff,
          google_event_id: payload.record.google_event_id,
        }
        await deleteSyncedAppointmentFromGoogle(record)
        break
      }
      default:
        return new Response('Bad Request', { status: 400 })
    }
  } catch (err) {
    // Sync itself is already best-effort/self-logging (google-sync.ts catches its own errors),
    // so reaching here means something unexpected happened in this endpoint's own logic.
    console.error('[appointment-sync] unexpected error', err)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

export const Route = createFileRoute('/api/internal/appointment-sync')({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) => handleAppointmentSync(request),
    },
  },
})
