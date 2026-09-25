import { Worker, type Job } from 'bullmq'
import type PocketBase from 'pocketbase'
import { createRedisConnection } from './redis-connection'
import {
  CONVERSATION_TURN_QUEUE_NAME,
  type ConversationTurnQueueData,
  type LifecycleMessageJobData,
} from './conversation-turn-queue'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { conversationLock } from '@/lib/async-lock'
import { runBotTurnInner } from '@/integrations/ai/agent.server'
import { transcribeAudioWithGroq } from '@/integrations/audio/server/groq-whisper'
import { logWhatsAppError } from '@/features/settings/server/whatsapp-error-log'
import { dispatchLifecycleMessage, markTriggerSent } from '@/features/lifecycle/server/lifecycle-service'

declare global {

  var __conversationTurnWorker: Worker<ConversationTurnQueueData> | undefined
}

/** Transcribes any audio messages in this conversation that haven't been transcribed yet
 *  (moved here from the old synchronous call in webhook.ts — same `transcribeAudioWithGroq`,
 *  just running in the worker instead of blocking the webhook's response to Meta). A failure
 *  here must never fail the job: it's logged and the message keeps its empty `body`, which
 *  `describeInboundBody` in agent.server.ts already falls back to a generic label for — the
 *  same behavior as today when transcription fails. */
async function transcribePendingAudio(su: PocketBase, conversationId: string): Promise<void> {
  const pending = await su.collection('messages').getFullList({
    filter: su.filter('conversation = {:cid} && type = "audio" && body = ""', { cid: conversationId }),
    sort: 'timestamp',
  })
  if (pending.length === 0) return

  const fileToken = await su.files.getToken()
  for (const msg of pending) {
    if (!msg.media) continue
    const t0 = Date.now()
    try {
      const fileUrl = su.files.getURL(msg, msg.media as string, { token: fileToken })
      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error(`media fetch failed: HTTP ${res.status}`)
      const blob = await res.blob()
      const transcript = await transcribeAudioWithGroq(blob, msg.media as string)
      if (transcript) {
        await su.collection('messages').update(msg.id, { body: transcript })
      }
      console.log(`[conversation-turn-worker] transcribe done message=${msg.id} ms=${Date.now() - t0}`)
    } catch (err) {
      console.error(`[conversation-turn-worker] transcribe failed message=${msg.id}:`, err)
    }
  }
}

async function processConversationTurn(job: Job<ConversationTurnQueueData>): Promise<void> {
  const { conversationId, customerId } = job.data as { conversationId: string; customerId: string }
  const t0 = Date.now()
  console.log(`[conversation-turn-worker] started job=${job.id} conversation=${conversationId} attempt=${job.attemptsMade + 1}`)

  const su = await getSuperuserClient()
  try {
    await conversationLock.runExclusive(conversationId, async () => {
      await transcribePendingAudio(su, conversationId)
      await runBotTurnInner({ su, conversationId, customerId })
    })
    console.log(`[conversation-turn-worker] completed job=${job.id} conversation=${conversationId} totalMs=${Date.now() - t0}`)
  } finally {
    await su.collection('conversations').update(conversationId, { bot_turn_phase: '' }).catch(() => null)
  }
}

/** Runs the same dispatchLifecycleMessage() that used to be called (and awaited synchronously)
 *  straight from lifecycle-service.ts's tick processors — now with retry/backoff on transient
 *  WhatsApp failures, and locked on the customer's conversation so a reminder can never race a
 *  bot turn or another lifecycle send touching the same conversation (both go through the same
 *  conversationLock either way now). Throwing lets BullMQ retry; a failure that exhausts all
 *  attempts leaves the trigger unmarked, so the next 15-minute tick's own time-window filter is
 *  still free to pick it up again — the same "unmarked = eligible to resend" behavior as before. */
async function processLifecycleMessage(job: Job<LifecycleMessageJobData>): Promise<void> {
  const { customerId, onSuccess, ...dispatchParams } = job.data
  console.log(`[conversation-turn-worker] started job=${job.id} customer=${customerId} trigger=${dispatchParams.triggerName} attempt=${job.attemptsMade + 1}`)

  const su = await getSuperuserClient()
  const customer = await su.collection('customers').getOne(customerId).catch(() => null)
  if (!customer) {
    console.warn(`[conversation-turn-worker] lifecycle job=${job.id}: customer=${customerId} no longer exists, skipping`)
    return
  }

  const conversation = await su.collection('conversations')
    .getFirstListItem(su.filter('customer = {:id}', { id: customerId }))
    .catch(() => null)
  const lockKey = conversation?.id ?? `customer:${customerId}`

  await conversationLock.runExclusive(lockKey, async () => {
    const ok = await dispatchLifecycleMessage({ su, customer, ...dispatchParams })
    if (!ok) {
      throw new Error(`dispatchLifecycleMessage returned false for customer=${customerId} trigger=${dispatchParams.triggerName}`)
    }

    if (onSuccess.kind === 'appointment_trigger') {
      const apt = await su.collection('appointments').getOne(onSuccess.appointmentId)
      await markTriggerSent(su, onSuccess.appointmentId, apt.lifecycle_sent, onSuccess.trigger, new Date().toISOString())
    } else {
      const conv = await su.collection('conversations').getOne(onSuccess.conversationId)
      const rawTattooInfo = (conv.tattoo_info as Record<string, unknown>) || {}
      await su.collection('conversations').update(onSuccess.conversationId, {
        tattoo_info: { ...rawTattooInfo, stalled_nudge_sent: true, stalled_nudge_at: new Date().toISOString() },
      })
    }
  })

  console.log(`[conversation-turn-worker] completed job=${job.id} customer=${customerId} trigger=${dispatchParams.triggerName}`)
}

async function processJob(job: Job<ConversationTurnQueueData>): Promise<void> {
  if (job.name === 'lifecycle-message') {
    return processLifecycleMessage(job as Job<LifecycleMessageJobData>)
  }
  return processConversationTurn(job)
}

export function startConversationTurnWorker(): void {
  if (globalThis.__conversationTurnWorker) return

  console.info('[conversation-turn-worker] Starting BullMQ conversation-turn worker...')
  const worker = new Worker<ConversationTurnQueueData>(CONVERSATION_TURN_QUEUE_NAME, processJob, {
    connection: createRedisConnection(),
    concurrency: 5,
  })

  worker.on('failed', (job, err) => {
    const target = job?.name === 'lifecycle-message' ? `customer=${job.data.customerId}` : `conversation=${(job?.data as ConversationTurnQueueData & { conversationId?: string })?.conversationId}`
    console.error(`[conversation-turn-worker] failed job=${job?.id} name=${job?.name} ${target} attempt=${job?.attemptsMade}:`, err)
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      logWhatsAppError('conversation_turn_queue', `job=${job.name} ${target}: ${err.message}`).catch(() => null)
    }
  })

  globalThis.__conversationTurnWorker = worker
}

export async function stopConversationTurnWorker(): Promise<void> {
  if (globalThis.__conversationTurnWorker) {
    await globalThis.__conversationTurnWorker.close()
    globalThis.__conversationTurnWorker = undefined
    console.info('[conversation-turn-worker] Stopped conversation-turn worker.')
  }
}
