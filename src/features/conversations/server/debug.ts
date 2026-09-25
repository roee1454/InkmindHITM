/**
 * Dev-only debugging tools for the WhatsApp AI agent. Wiping conversations/messages lets you
 * repeatedly test a fresh bot flow against a real number without accumulating history that'd
 * otherwise change the agent's context every run. Gated on `NODE_ENV === 'development'` on the
 * server (never trust the client to hide the button as the only guard) in addition to the
 * normal admin-session check other destructive settings actions use.
 */
import { createServerFn } from '@tanstack/react-start'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAdmin } from '@/features/settings/server/helpers.server'
import { cancelPendingBotTurn } from '@/integrations/ai/engine/turn-cancellation.server'

export interface ResetConversationsResult {
  ok: true
  deletedMessages: number
  deletedConversations: number
}

export const resetConversations = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ResetConversationsResult> => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('פעולה זו זמינה רק בסביבת פיתוח.')
    }
    await requireAdmin()
    const su = await getSuperuserClient()

    // `messages.conversation` cascades, so deleting a conversation takes its messages with it in
    // the same transaction. Stop any bot turn first so it can't reply into a deleted chat.
    const { totalItems: deletedMessages } = await su.collection('messages').getList(1, 1, { fields: 'id' })
    const conversations = await su.collection('conversations').getFullList({ fields: 'id' })
    for (const conversation of conversations) {
      cancelPendingBotTurn(conversation.id)
      await su.collection('conversations').delete(conversation.id)
    }

    return { ok: true, deletedMessages, deletedConversations: conversations.length }
  },
)
