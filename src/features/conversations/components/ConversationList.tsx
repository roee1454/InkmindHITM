import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { listConversations } from '../server/messages'
import { formatListTimestamp, formatWindowRemaining } from '../lib/format'
import type { UIConversation } from '../types'
import { useConversationsUiStore } from '../store/conversationsUiStore'

const STATUS_LABEL: Record<string, string> = {
  bot_active: 'בוט',
  escalated: 'הוסלם',
  staff_handling: 'צוות',
  closed: 'סגור',
}

interface ConversationListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { searchQuery, setSearchQuery } = useConversationsUiStore()
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => listConversations(),
    // Realtime is the primary path (dashboard route subscription); long-interval
    // fallback only (HITL-10 — was 8s alongside realtime).
    refetchInterval: 60000,
  })

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) => c.customerName.toLowerCase().includes(q) || c.customerPhone.toLowerCase().includes(q),
    )
  }, [conversations, searchQuery])

  return (
    // Full width on mobile (it's the whole screen when no chat is selected); the fixed 288px
    // rail with its divider only applies once the thread sits beside it at lg.
    <div className="flex h-full w-full shrink-0 flex-col bg-card lg:w-72 lg:border-e lg:border-border">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון"
            className="pe-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">טוען שיחות…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? 'לא נמצאו שיחות.' : 'עדיין אין שיחות.'}
          </p>
        ) : (
          <ul>
            {filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                selected={c.id === selectedId}
                onSelect={() => onSelect(c.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ConversationRow({
  conversation,
  selected,
  onSelect,
}: {
  conversation: UIConversation
  selected: boolean
  onSelect: () => void
}) {
  const title = conversation.customerName || conversation.customerPhone || 'לא ידוע'
  const windowInfo = formatWindowRemaining(conversation.windowExpiresAt)
  const windowDotColor =
    windowInfo.status === 'open'
      ? 'bg-emerald-500'
      : windowInfo.status === 'closing-soon'
        ? 'bg-amber-500'
        : 'bg-muted-foreground/30'
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-start font-assistant transition-colors ${
          selected ? 'bg-primary/10' : 'hover:bg-accent'
        }`}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-sm font-bold text-foreground">{title}</span>
          <span className="shrink-0 text-micro text-muted-foreground">
            {formatListTimestamp(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span
              className={`size-1.5 shrink-0 rounded-full ${windowDotColor}`}
              title={`חלון 24 שעות: ${windowInfo.label}`}
            />
            {conversation.customerPhone}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {conversation.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-micro font-extrabold text-white leading-none">
                {conversation.unreadCount}
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-micro text-muted-foreground">
              {STATUS_LABEL[conversation.status] ?? conversation.status}
            </span>
          </div>
        </div>
      </button>
    </li>
  )
}
