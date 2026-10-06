import { enqueueLifecycleMessage } from '@/lib/queue/conversation-turn-queue'
import type { LifecycleMessageJobData } from '@/lib/queue/conversation-turn-queue'

/**
 * Everything a tick would do, as data. A dry run (see lifecycle-simulation.ts) collects these
 * instead of acting, which is how lifecycle timing is tested at any simulated "now" without
 * moving the machine's clock — moving it poisons every timestamp and cache written meanwhile.
 */
export type LifecyclePlannedAction =
  | { kind: 'message'; trigger: string; customerId: string; body: string; target: LifecycleMessageJobData['onSuccess'] }
  | { kind: 'complete_appointment'; appointmentId: string }
  | { kind: 'mark_project_lost'; projectId: string; reason: string }
  | { kind: 'staff_digest'; count: number }
  | { kind: 'cancel_stale_pending'; appointmentId: string }
  | { kind: 'transition_conversation'; conversationId: string; to: string; reason: string }
  | { kind: 'reconcile_conversation'; conversationId: string; from: string; to: string | null; reason: string }

export interface LifecycleRunOptions {
  /** Record the plan without sending messages or writing records. */
  dryRun?: boolean
  /** When set, every action (dry or real) is appended here. */
  plan?: LifecyclePlannedAction[]
}

/** Runs one side effect, or in a dry run only records it. */
export async function effect(options: LifecycleRunOptions, action: LifecyclePlannedAction, apply: () => Promise<unknown>): Promise<void> {
  options.plan?.push(action)
  if (!options.dryRun) await apply()
}

export function dispatchMessage(options: LifecycleRunOptions, job: LifecycleMessageJobData): Promise<void> {
  return effect(
    options,
    { kind: 'message', trigger: job.triggerName, customerId: job.customerId, body: job.messageBody, target: job.onSuccess },
    () => enqueueLifecycleMessage(job),
  )
}
