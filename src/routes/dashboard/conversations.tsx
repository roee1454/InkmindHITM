import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { ConversationList } from '@/features/conversations/components/ConversationList'
import { ConversationThread } from '@/features/conversations/components/ConversationThread'
import { ConnectionStatusBanner } from '@/features/conversations/components/ConnectionStatusBanner'
import {
  getWhatsAppConnectionStatus,
  listConversations,
} from '@/features/conversations/server/messages'

const searchSchema = z.object({ chatId: z.string().optional() })

export const Route = createFileRoute('/dashboard/conversations')({
  validateSearch: searchSchema,
  component: ConversationsPage,
})

function ConversationsPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { chatId } = Route.useSearch()

  const statusQuery = useQuery({
    queryKey: ['whatsapp-connection-status'],
    queryFn: () => getWhatsAppConnectionStatus(),
  })

  // Shares the ['conversations'] cache with ConversationList — used only to resolve the
  // selected conversation object for the thread header.
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => listConversations(),
    // Shares ['conversations'] with ConversationList; realtime updates it, this is fallback.
    refetchInterval: 60000,
  })
  const selected = conversations.find((c) => c.id === chatId) ?? null

  function select(id: string) {
    navigate({ search: { chatId: id } })
  }

  return (
    <div className="h-svh w-full overflow-hidden">
      <div className="flex h-full">
        {statusQuery.data && !statusQuery.data.configured ? (
          <ConnectionStatusBanner />
        ) : (
          <>
            <ConversationList selectedId={chatId ?? null} onSelect={select} />
            {selected ? (
              <ConversationThread conversation={selected} />
            ) : (
              <div className="flex flex-1 items-center justify-center bg-background">
                <p className="font-assistant text-sm text-muted-foreground">
                  בחרו שיחה כדי להציג את ההודעות.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
