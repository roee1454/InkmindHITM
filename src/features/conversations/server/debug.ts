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

    // Messages first — `messages.conversation` isn't a cascade-delete relation, so deleting
    // conversations first would leave orphaned message rows pointing at a deleted conversation.
    const messages = await su.collection('messages').getFullList({ fields: 'id' })
    await Promise.all(messages.map((m) => su.collection('messages').delete(m.id)))

    const conversations = await su.collection('conversations').getFullList({ fields: 'id' })
    await Promise.all(conversations.map((c) => su.collection('conversations').delete(c.id)))

    return { ok: true, deletedMessages: messages.length, deletedConversations: conversations.length }
  },
)
