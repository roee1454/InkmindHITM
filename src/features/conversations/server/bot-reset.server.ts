import type PocketBase from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAdmin } from '@/features/settings/server/helpers.server'
import { cancelPendingBotTurn } from '@/integrations/ai/agent.server'
import { conversationLock } from '@/lib/async-lock'
import { transition } from './state-machine'

/**
 * Starts the bot's conversation with this customer over: back to NEW, nothing collected, no project
 * attached. The explicit replacement for moving a lead on the old leads board, which silently
 * rewrote the bot's state. Stops a running bot turn first, like a delete does.
 */
export async function handleResetBotConversation(conversationId: string, deps: { su?: PocketBase; now?: Date } = {}): Promise<void> {
  if (!deps.su) await requireAdmin()
  const su = deps.su ?? (await getSuperuserClient())
  const nowIso = (deps.now ?? new Date()).toISOString()
  cancelPendingBotTurn(conversationId)
  await conversationLock.runExclusive(conversationId, () =>
    transition(su, conversationId, 'NEW', {
      actor: 'staff',
      reason: 'staff_reset',
      extraFields: {
        active_project: '',
        tattoo_info: null,
        booking_session_started_at: nowIso,
        is_staff_called: false,
        staff_call_reason: '',
        status: 'bot_active',
      },
    }),
  )
}
