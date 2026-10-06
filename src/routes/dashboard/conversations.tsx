import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ConversationsPage } from '@/features/conversations/ConversationsPage'

const searchSchema = z.object({ chatId: z.string().optional() })

export const Route = createFileRoute('/dashboard/conversations')({
  validateSearch: searchSchema,
  component: ConversationsRouteComponent,
})

function ConversationsRouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { chatId } = Route.useSearch()

  return (
    <ConversationsPage
      chatId={chatId}
      onSelectChat={(id) => navigate({ search: { chatId: id } })}
      onBack={() => navigate({ search: {} })}
    />
  )
}
