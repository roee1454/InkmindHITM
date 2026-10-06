import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, BotOff } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { phoneMatchesQuery } from '@/lib/phone'
import { getAiSettings } from '@/features/settings/server/ai'
import { listConversations } from '../server/messages'
import { inboxBucket } from '../utils/labels'
import type { InboxBucket } from '../utils/labels'
import { useConversationsUiStore } from '../store/conversationsUiStore'
import { NewConversationDialog } from './NewConversationDialog'
import { ConversationRow } from './ConversationRow'

const FILTERS: { id: 'all' | Exclude<InboxBucket, 'closed'>; label: string; empty: string }[] = [
  { id: 'all', label: 'הכל', empty: 'עדיין אין שיחות. כשלקוח יכתוב לסטודיו בוואטסאפ, השיחה תופיע כאן.' },
  { id: 'escalated', label: 'ממתין', empty: 'אין שיחות שמחכות לצוות.' },
  { id: 'staff_handling', label: 'צוות', empty: 'אין שיחות בטיפול צוות.' },
  { id: 'bot_active', label: 'בוט', empty: 'אין שיחות שהבוט מנהל עכשיו.' },
]

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

  const { data: aiSettings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => getAiSettings(),
    refetchInterval: 60000,
  })

  const buckets = useMemo(() => new Map(conversations.map((c) => [c.id, inboxBucket(c)])), [conversations])
  const waiting = useMemo(() => [...buckets.values()].filter((b) => b === 'escalated').length, [buckets])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return conversations.filter((c) => {
      if (q && !c.customerName.toLowerCase().includes(q) && !phoneMatchesQuery(c.customerPhone, q)) return false
      return statusFilter === 'all' || buckets.get(c.id) === statusFilter
    })
  }, [conversations, buckets, searchQuery, statusFilter])

  const activeFilter = FILTERS.find((f) => f.id === statusFilter) ?? FILTERS[0]!

  return (
    <div className="flex h-full w-full shrink-0 flex-col bg-card font-assistant lg:w-80 lg:border-e lg:border-border" dir="rtl">
      <div className="flex flex-col gap-3 border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">שיחות</h1>
          <Button variant="ghost" size="icon" onClick={() => setIsNewChatOpen(true)} aria-label="שיחה חדשה" className="size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <Plus className="size-5" />
          </Button>
        </div>

        <SearchInput size="sm" variant="muted" placeholder="חיפוש לפי שם או טלפון" value={searchQuery} onChange={setSearchQuery} />

        <div role="group" aria-label="סינון שיחות" className="flex gap-1 rounded-xl bg-muted p-1">
          {FILTERS.map((filter) => {
            const active = statusFilter === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  'flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 select-none',
                  active ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {filter.label}
                {filter.id === 'escalated' && waiting > 0 && <span className="text-xs font-bold tabular-nums">{waiting}</span>}
              </button>
            )
          })}
        </div>

        {aiSettings && !aiSettings.aiEnabled && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs text-warning">
            <BotOff className="size-4 shrink-0 text-warning" />
            <span className="font-bold">סוכן ה-AI מושבת בהגדרות – כל השיחות במענה ידני</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-4 p-4" aria-hidden>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            {searchQuery
              ? 'אין שיחות שמתאימות לחיפוש.'
              : statusFilter === 'bot_active' && aiSettings && !aiSettings.aiEnabled
                ? 'סוכן ה-AI מושבת בהגדרות הסטודיו. כל עוד הבוט כבוי, שיחות נכנסות מנוהלות ישירות ע״י הצוות.'
                : activeFilter.empty}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((c) => (
              <ConversationRow key={c.id} conversation={c} selected={c.id === selectedId} onSelect={() => onSelect(c.id)} />
            ))}
          </ul>
        )}
      </div>

      <NewConversationDialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen} onSelectConversation={onSelect} />
    </div>
  )
}
