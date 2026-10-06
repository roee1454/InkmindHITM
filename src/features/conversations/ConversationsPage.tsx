import { useQuery } from '@tanstack/react-query'
import { ConversationList } from '@/features/conversations/components/ConversationList'
import { ConversationThread } from '@/features/conversations/components/ConversationThread'
import { ConnectionStatusBanner } from '@/features/conversations/components/ConnectionStatusBanner'
import {
  getWhatsAppConnectionStatus,
  listConversations,
} from '@/features/conversations/server/messages'
import { useIsMobile } from '#/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'

interface ConversationsPageProps {
  chatId?: string
  onSelectChat: (id: string) => void
  onBack: () => void
}

export function ConversationsPage({ chatId, onSelectChat, onBack }: ConversationsPageProps) {
  const statusQuery = useQuery({
    queryKey: ['whatsapp-connection-status'],
    queryFn: () => getWhatsAppConnectionStatus(),
  })

  // Shares the ['conversations'] cache with ConversationList — used only to resolve the
  // selected conversation object for the thread header.
  const { data: conversations = [], isFetching: isFetchingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => listConversations(),
    // Shares ['conversations'] with ConversationList; realtime updates it, this is fallback.
    refetchInterval: 60000,
  })
  const selected = conversations.find((c) => c.id === chatId) ?? null

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
            {showList && <ConversationList selectedId={chatId ?? null} onSelect={onSelectChat} />}
            {showThread &&
              (selected ? (
                <ConversationThread
                  conversation={selected}
                  onBack={isMobile ? onBack : undefined}
                  onDeleted={onBack}
                />
              ) : !isMobile ? (
                <div className="flex flex-1 items-center justify-center bg-background">
                  <p className="font-assistant text-sm text-muted-foreground">
                    {chatId && !isFetchingConversations ? 'השיחה הזו כבר לא קיימת.' : 'בחרו שיחה כדי להציג את ההודעות.'}
                  </p>
                </div>
              ) : (
                chatId &&
                !isFetchingConversations && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background font-assistant">
                    <p className="text-sm text-muted-foreground">השיחה הזו כבר לא קיימת.</p>
                    <Button variant="outline" size="sm" onClick={onBack}>
                      חזרה לרשימת השיחות
                    </Button>
                  </div>
                )
              ))}
          </>
        )}
      </div>
    </div>
  )
}

export default ConversationsPage

