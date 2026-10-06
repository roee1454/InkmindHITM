import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const resetBotConversation = createServerFn({ method: 'POST' })
  .validator(z.object({ conversationId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { handleResetBotConversation } = await import('./bot-reset.server')
    await handleResetBotConversation(data.conversationId)
    return { ok: true }
  })
