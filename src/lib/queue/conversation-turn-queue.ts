import { Queue, QueueEvents } from 'bullmq'
import type { TemplateComponent } from '@/integrations/whatsapp-cloud-api/client'
import type { LifecycleTrigger, ProjectLifecycleTrigger } from '@/features/lifecycle/utils/triggers'
import { createRedisConnection } from './redis-connection'

export const CONVERSATION_TURN_QUEUE_NAME = 'conversation-turn'

export interface ConversationTurnJobData {
  conversationId: string
  customerId: string
}

/** What the worker does once dispatchLifecycleMessage succeeds — mirrors the two different
 *  "mark as sent" bookkeeping paths in lifecycle-service.ts (appointment lifecycle_sent vs a
 *  conversation's stalled_nudge_sent flag), moved here so a job that fails every retry leaves
 *  that bookkeeping untouched and the next 15-minute tick's own time-window filter can pick it
 *  up again — the same "unmarked = eligible to resend" behavior the code already relied on. */
export type LifecycleMessageOnSuccess =
  | { kind: 'appointment_trigger'; appointmentId: string; trigger: LifecycleTrigger }
  | { kind: 'stalled_nudge'; conversationId: string }
  /** `awaitScore`: the message asked for a 1–10 score, so the conversation waits for the answer. */
  | { kind: 'project_trigger'; projectId: string; trigger: ProjectLifecycleTrigger; awaitScore?: boolean }

export interface LifecycleMessageJobData {
  customerId: string
  messageBody: string
  triggerName: string
  templateName?: string
  templateComponents?: TemplateComponent[]
  onSuccess: LifecycleMessageOnSuccess
}

export type ConversationTurnQueueData = ConversationTurnJobData | LifecycleMessageJobData

declare global {

  var __conversationTurnQueue: Queue<ConversationTurnQueueData> | undefined

  var __conversationTurnQueueEvents: QueueEvents | undefined
}

function getQueue(): Queue<ConversationTurnQueueData> {
  if (!globalThis.__conversationTurnQueue) {
    globalThis.__conversationTurnQueue = new Queue<ConversationTurnQueueData>(CONVERSATION_TURN_QUEUE_NAME, {
      connection: createRedisConnection(),
    })
  }
  return globalThis.__conversationTurnQueue
}

/** "Redis side" logging: QueueEvents subscribes to Redis pub/sub and reports what BullMQ itself
 *  tracks about each job (waiting/active/completed/failed/stalled) — independent of, and a
 *  useful cross-check against, the worker's own business-logic logs in conversation-turn-worker.ts. */
function ensureQueueEventsLogging(): void {
  if (globalThis.__conversationTurnQueueEvents) return

  const events = new QueueEvents(CONVERSATION_TURN_QUEUE_NAME, { connection: createRedisConnection() })
  events.on('waiting', ({ jobId }) => console.log(`[conversation-turn-queue-events] waiting job=${jobId}`))
  events.on('active', ({ jobId, prev }) =>
    console.log(`[conversation-turn-queue-events] active job=${jobId} prev=${prev}`))
  events.on('completed', ({ jobId }) => console.log(`[conversation-turn-queue-events] completed job=${jobId}`))
  events.on('failed', ({ jobId, failedReason }) =>
    console.error(`[conversation-turn-queue-events] failed job=${jobId} reason=${failedReason}`))
  events.on('stalled', ({ jobId }) => console.warn(`[conversation-turn-queue-events] stalled job=${jobId}`))
  globalThis.__conversationTurnQueueEvents = events
  console.info('[conversation-turn-queue-events] Listening for Redis-side queue lifecycle events...')
}

export async function enqueueConversationTurn(data: ConversationTurnJobData): Promise<void> {
  ensureQueueEventsLogging()
  const job = await getQueue().add('process-turn', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86_400 },
  })
  console.log(`[conversation-turn-queue] enqueued job=${job.id} conversation=${data.conversationId}`)
}

/** Deterministic jobId per (trigger, target) so a lifecycle tick that somehow overlaps the
 *  previous one's queued-but-not-yet-processed job dedupes instead of double-sending. */
function lifecycleJobId(data: LifecycleMessageJobData): string {
  const target =
    data.onSuccess.kind === 'appointment_trigger'
      ? data.onSuccess.appointmentId
      : data.onSuccess.kind === 'project_trigger'
        ? data.onSuccess.projectId
        : data.onSuccess.conversationId
  return `lifecycle:${data.triggerName}:${target}`
}

export async function enqueueLifecycleMessage(data: LifecycleMessageJobData): Promise<void> {
  ensureQueueEventsLogging()
  const jobId = lifecycleJobId(data)
  const job = await getQueue().add('lifecycle-message', data, {
    jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86_400 },
  })
  console.log(`[conversation-turn-queue] enqueued job=${job.id} customer=${data.customerId} trigger=${data.triggerName}`)
}
