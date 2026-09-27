import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { listConversations } from '../server/messages'
import { STATUS_LABEL } from '../utils/labels'
import { useConversationsUiStore } from '../store/conversationsUiStore'
import { cn } from '@/lib/utils'
import { phoneMatchesQuery } from '@/lib/phone'
import { NewConversationDialog } from './NewConversationDialog'
import { ConversationRow } from './ConversationRow'

interface ConversationListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { searchQuery, setSearchQuery, statusFilter, setStatusFilter } = useConversationsUiStore()
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => listConversations(),
    refetchInterval: 30000,
  })

  const counts = useMemo(() => {
    let escalated = 0
    let staff_handling = 0
    let bot_active = 0

    for (const c of conversations) {
      if (c.status === 'escalated') escalated++
      else if (c.status === 'staff_handling') staff_handling++
      else if (c.status === 'bot_active') bot_active++
    }

    return { all: conversations.length, escalated, staff_handling, bot_active }
  }, [conversations])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return conversations.filter((c) => {
      if (q && !c.customerName.toLowerCase().includes(q) && !phoneMatchesQuery(c.customerPhone, q)) {
        return false
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [conversations, searchQuery, statusFilter])

  const filterSegments = [
    { id: 'all', label: 'הכל', count: counts.all },
    { id: 'escalated', label: 'ממתין', count: counts.escalated, badge: counts.escalated > 0 },
    { id: 'staff_handling', label: 'צוות', count: counts.staff_handling },
    { id: 'bot_active', label: 'בוט', count: counts.bot_active },
  ]

  return (
    <div className="flex h-full w-full shrink-0 flex-col bg-card lg:w-80 lg:border-e lg:border-border font-assistant" dir="rtl">
      {/* Top Header & Filters */}
      <div className="flex flex-col gap-2.5 border-b border-border p-3.5 pb-3">
        {/* Title and New Chat Button */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">שיחות</h1>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsNewChatOpen(true)}
            className="size-8.5 rounded-xl border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            title="שיחה חדשה"
          >
            <Plus className="size-4.5" />
          </Button>
        </div>

        {/* Search Bar */}
        <SearchInput
          size="sm"
          variant="muted"
          placeholder="חיפוש לפי שם או טלפון"
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Single Responsive Segmented Filter Bar */}
        <div role="group" aria-label="סינון לפי סטטוס" className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
          {filterSegments.map((seg) => {
            const active = statusFilter === seg.id
            return (
              <button
                key={seg.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(seg.id)}
                className={cn(
                  'flex h-7.5 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all select-none cursor-pointer',
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs font-extrabold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span>{seg.label}</span>
                {seg.badge && (
                  <span
                    className={cn(
                      'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-2xs font-extrabold tabular-nums leading-none',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-status-wait-soft text-status-wait',
                    )}
                  >
                    {seg.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversation List Rows */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/50 animate-pulse">
                <div className="size-10 rounded-full bg-muted shrink-0" />
                <div className="flex flex-1 flex-col gap-2 min-w-0">
                  <div className="flex justify-between items-center">
                    <div className="h-3.5 w-24 rounded bg-muted" />
                    <div className="h-3 w-10 rounded bg-muted/60" />
                  </div>
                  <div className="h-3 w-36 rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground leading-relaxed">
            {searchQuery
              ? 'לא נמצאו שיחות תואמות לחיפוש.'
              : statusFilter === 'escalated'
                ? 'אין שיחות הממתינות למענה של צוות.'
                : statusFilter !== 'all'
                  ? `אין שיחות בסטטוס ${STATUS_LABEL[statusFilter] || statusFilter}.`
                  : 'עדיין אין שיחות במערכת.'}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
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

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={isNewChatOpen}
        onOpenChange={setIsNewChatOpen}
        onSelectConversation={(newId) => {
          onSelect(newId)
        }}
      />
    </div>
  )
}
