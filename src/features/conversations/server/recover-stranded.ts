/**
 * Boot-time recovery for bot turns lost to a restart (FLOW-7). The debounce scheduler
 * is an in-memory setTimeout (src/lib/debounce-scheduler.ts): a deploy landing inside
 * the debounce window silently drops the pending turn, and the customer never gets an
 * answer — with no trace anywhere. This scan finds conversations whose newest message
 * is an unanswered inbound and re-runs the turn.
 *
 * Guards against false positives:
 * - `bot_active` only — escalated / staff_handling / closed conversations never
 *   auto-reply, and every deliberate-silence path in the agent (handoffs, staff calls)
 *   also flips the status away from `bot_active` first.
 * - older than 30s — anything younger may still have a live debounce from a webhook
 *   that arrived after this boot.
 * - younger than 24h — beyond WhatsApp's customer-service window a reply may not be
 *   deliverable anyway, and answering day-old silence out of nowhere reads as broken.
 */
import type PocketBase from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { runBotTurn } from '@/integrations/ai/agent.server'

const MIN_AGE_MS = 30_000
const MAX_AGE_MS = 24 * 60 * 60 * 1000

async function newestMessage(su: PocketBase, conversationId: string) {
  const page = await su.collection('messages').getList(1, 1, {
    filter: `conversation = "${conversationId}"`,
    sort: '-timestamp',
  })
  return page.items[0] ?? null
}

export async function recoverStrandedBotTurns(): Promise<void> {
  const su = await getSuperuserClient()

  const settings = await su.collection('settings').getList(1, 1)
  if (!settings.items[0]?.ai_enabled) return

  const conversations = await su.collection('conversations').getFullList({
    filter: 'status = "bot_active"',
  })

  for (const conv of conversations) {
    const last = await newestMessage(su, conv.id)
    if (!last || last.direction !== 'inbound') continue

    const ageMs = Date.now() - new Date(last.timestamp as string).getTime()
    if (ageMs < MIN_AGE_MS || ageMs > MAX_AGE_MS) continue

    console.log(`[recover-stranded] unanswered inbound in conversation ${conv.id} (${Math.round(ageMs / 1000)}s old) — running bot turn`)
    // Sequential on purpose: single-studio volume is tiny, and runBotTurn already
    // serializes per-conversation via conversationLock.
    await runBotTurn({ su, conversationId: conv.id, customerId: conv.customer as string })
      .catch((err) => console.error(`[recover-stranded] bot turn failed for ${conv.id}:`, err))
  }
}
