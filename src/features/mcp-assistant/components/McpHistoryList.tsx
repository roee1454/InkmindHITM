import { useMemo, useState } from 'react'
import { MessageCircle, Plus, Search, Trash2 } from 'lucide-react'
import { formatListTimestamp } from '@/features/conversations/lib/format'
import { useConfirm } from '@/hooks/use-confirm'
import { useDeleteMcpConversation, useMcpConversationsList } from '../hooks/useMcpConversation'
import { useMcpUiStore } from '../store/mcpUiStore'

function dateGroupLabel(iso: string | null): string {
  if (!iso) return 'ללא תאריך'
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  if (diffDays <= 0) return 'היום'
  if (diffDays === 1) return 'אתמול'
  if (diffDays <= 7) return '7 הימים האחרונים'
  return 'ישנות יותר'
}

interface McpHistoryListProps {
  onSelect: (conversationId: string) => void
  onCreate: () => void
  creating?: boolean
}

export function McpHistoryList({ onSelect, onCreate, creating }: McpHistoryListProps) {
  const { data: conversations, isLoading } = useMcpConversationsList()
  const activeConversationId = useMcpUiStore((s) => s.activeConversationId)
  const [query, setQuery] = useState('')
  const confirm = useConfirm()
  const deleteConversation = useDeleteMcpConversation()

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'למחוק את השיחה?',
      description: `"${title}" — כולל כל ההודעות והפעולות שבה. לא ניתן לשחזר.`,
      confirmLabel: 'מחיקה',
      variant: 'destructive',
    })
    if (ok) deleteConversation.mutate(id)
  }

  const grouped = useMemo(() => {
    const filtered = (conversations || []).filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
    const groups = new Map<string, typeof filtered>()
    for (const c of filtered) {
      const key = dateGroupLabel(c.lastMessageAt || c.created)
      const list = groups.get(key) ?? []
      list.push(c)
      groups.set(key, list)
    }
    return Array.from(groups.entries())
  }, [conversations, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-2.5 border-b border-border p-3.5">
        <div className="flex h-11 items-center gap-2 rounded-[15px] bg-muted px-3.5">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש בשיחות"
            className="h-full flex-1 bg-transparent text-[14px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          disabled={creating}
          onClick={onCreate}
          className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[15px] bg-primary text-[14px] font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
        >
          <Plus size={17} />
          שיחה חדשה
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {isLoading && <p className="px-2 py-3 text-center text-[13px] text-muted-foreground">טוען…</p>}
        {!isLoading && grouped.length === 0 && (
          <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">אין עדיין שיחות עם העוזר.</p>
        )}
        {grouped.map(([label, items]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="px-2 pb-1 pt-2 text-[11.5px] font-extrabold tracking-wide text-muted-foreground">{label}</span>
            {items.map((c) => {
              const active = c.id === activeConversationId
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2.5 rounded-[15px] px-2.5 py-2.5 ${active ? 'bg-primary/10' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-right"
                  >
                    <span
                      className={`flex size-[34px] shrink-0 items-center justify-center rounded-[11px] ${
                        active ? 'bg-card text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <MessageCircle size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[14.5px] font-extrabold ${active ? 'text-primary' : 'text-foreground'}`}>{c.title}</p>
                    </div>
                    <span className="shrink-0 text-[11.5px] font-bold text-muted-foreground">{formatListTimestamp(c.lastMessageAt || c.created)}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="מחיקת שיחה"
                    disabled={deleteConversation.isPending}
                    onClick={() => handleDelete(c.id, c.title)}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
