import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { deleteGoogleCalendarEvent } from '@/integrations/google-calendar/server/google-auth.server'

/**
 * Drains integration_outbox — side effects of deletes that live outside PocketBase. Rows are
 * written by pocketbase/pb_hooks/lib/data-integrity.js inside the delete's own transaction, so a
 * committed delete always leaves a row and a rolled-back one never does. Handlers must be
 * idempotent: a crash between the side effect and marking the row done runs it again.
 */
export const OUTBOX_MAX_ATTEMPTS = 8
const BATCH_SIZE = 25
const RUNNER_INTERVAL_MS = 60_000

const gcalDeleteEventPayload = z.object({
  appointmentId: z.string(),
  staffId: z.string().min(1),
  googleEventId: z.string().min(1),
})

type OutboxOutcome = { status: 'done' } | { status: 'retry'; error: string } | { status: 'failed'; error: string }

/** Exponential backoff between attempts: 1, 2, 4 … minutes, capped at one hour. */
export function nextAttemptDelayMs(attempts: number): number {
  return Math.min(60, 2 ** Math.max(0, attempts - 1)) * 60_000
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function deleteGoogleEvent(su: PocketBase, payload: unknown): Promise<OutboxOutcome> {
  const parsed = gcalDeleteEventPayload.safeParse(payload)
  if (!parsed.success) return { status: 'failed', error: `invalid payload: ${parsed.error.message}` }
  const { staffId, googleEventId } = parsed.data

  // The artist disconnected Google or was deleted since: their calendar is out of our reach and
  // the cascade already removed the stored credentials, so there's nothing left to clean up.
  const connection = await su.collection('credentials').getList(1, 1, {
    filter: su.filter("staff = {:staff} && provider = 'google_calendar'", { staff: staffId }),
    fields: 'id',
  })
  if (connection.items.length === 0) return { status: 'done' }

  try {
    // Already treats Google's 404/410 as success, which is what makes re-runs safe.
    await deleteGoogleCalendarEvent(staffId, googleEventId)
    return { status: 'done' }
  } catch (err) {
    return { status: 'retry', error: errorMessage(err) }
  }
}

async function runRow(su: PocketBase, row: RecordModel): Promise<OutboxOutcome> {
  if (row.kind === 'gcal_delete_event') return deleteGoogleEvent(su, row.payload)
  return { status: 'failed', error: `unknown outbox kind: ${String(row.kind)}` }
}

async function settleRow(su: PocketBase, row: RecordModel, outcome: OutboxOutcome, now: Date): Promise<void> {
  const attempts = (Number(row.attempts) || 0) + 1
  const outbox = su.collection('integration_outbox')

  if (outcome.status === 'done') {
    await outbox.update(row.id, { status: 'done', attempts, last_error: '', processed_at: now.toISOString() })
    return
  }
  if (outcome.status === 'failed' || attempts >= OUTBOX_MAX_ATTEMPTS) {
    console.error(`[integration-outbox] giving up on ${row.kind} ${row.id} after ${attempts} attempts: ${outcome.error}`)
    await outbox.update(row.id, { status: 'failed', attempts, last_error: outcome.error, processed_at: now.toISOString() })
    return
  }
  await outbox.update(row.id, {
    attempts,
    last_error: outcome.error,
    available_at: new Date(now.getTime() + nextAttemptDelayMs(attempts)).toISOString(),
  })
}

async function drainOnce(suArg: PocketBase | undefined, now: Date): Promise<number> {
  const su = suArg ?? (await getSuperuserClient())
  const due = await su.collection('integration_outbox').getList(1, BATCH_SIZE, {
    filter: su.filter("status = 'pending' && available_at <= {:now}", { now }),
    sort: 'available_at',
  })
  for (const row of due.items) {
    const outcome = await runRow(su, row).catch((err: unknown): OutboxOutcome => ({ status: 'retry', error: errorMessage(err) }))
    await settleRow(su, row, outcome, now)
  }
  return due.items.length
}

let running: Promise<number> | null = null

/**
 * Processes the rows that are due. One drain at a time per process: a concurrent call joins the
 * one already running instead of racing it for the same rows. Returns how many rows it handled.
 */
export function drainIntegrationOutbox(su?: PocketBase, now: Date = new Date()): Promise<number> {
  running ??= drainOnce(su, now).finally(() => {
    running = null
  })
  return running
}

declare global {
  var __integrationOutboxInterval: NodeJS.Timeout | undefined
}

/** Background safety net for rows written by deletes that didn't go through the CRM (admin UI, retries). */
export function startIntegrationOutboxRunner(): void {
  if (globalThis.__integrationOutboxInterval) return
  globalThis.__integrationOutboxInterval = setInterval(() => {
    drainIntegrationOutbox().catch((err) => console.error('[integration-outbox] drain failed:', err))
  }, RUNNER_INTERVAL_MS)
}
