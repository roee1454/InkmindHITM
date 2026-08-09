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
import { useIsMobile } from '@/hooks/use-media-query'

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

  // List/detail: both panes side by side on desktop, one at a time on mobile. `chatId` is
  // already the URL-level source of truth, so this needs no extra state — and the browser's
  // own back button works as the back affordance too.
  const isMobile = useIsMobile()
  const showList = !isMobile || !chatId
  const showThread = !isMobile || !!chatId

  return (
    // Both custom properties are 0rem on desktop, so this resolves to 100svh exactly as before.
    <div className="h-[calc(100svh-var(--app-top-bar-h)-var(--app-bottom-nav-h))] w-full overflow-hidden">
      <div className="flex h-full">
        {statusQuery.data && !statusQuery.data.configured ? (
          <ConnectionStatusBanner />
        ) : (
          <>
            {showList && <ConversationList selectedId={chatId ?? null} onSelect={select} />}
            {showThread &&
              (selected ? (
                <ConversationThread
                  conversation={selected}
                  onBack={isMobile ? () => navigate({ search: {} }) : undefined}
                />
              ) : (
                !isMobile && (
                  <div className="flex flex-1 items-center justify-center bg-background">
                    <p className="font-assistant text-sm text-muted-foreground">
                      בחרו שיחה כדי להציג את ההודעות.
                    </p>
                  </div>
                )
              ))}
          </>
        )}
      </div>
    </div>
  )
}
