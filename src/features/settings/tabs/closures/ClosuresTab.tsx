import { useMemo, useState } from 'react'
import { CalendarDays, Edit3, Plus, Repeat, Trash2 } from '@/components/ui/icon'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchInput } from '@/components/ui/search-input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getStudioClosures, deleteStudioClosure } from '@/features/settings/server/settings'
import type { StudioClosure } from '@/features/settings/server/settings'
import { SettingsPage, SettingsSection } from '@/features/settings/components/settings-layout'
import { sortClosureGroups } from './utils/closureSorting'
import type { ClosureGroup } from './utils/closureSorting'
import { AddClosureDialog } from './components/AddClosureDialog'
import { EditClosureDialog } from './components/EditClosureDialog'

function groupClosures(closures: StudioClosure[]): ClosureGroup[] {
  const groups = new Map<string, ClosureGroup>()
  for (const c of closures) {
    const key = c.reason ? `reason:${c.reason}` : `id:${c.id}`
    const existing = groups.get(key)
    if (existing) {
      existing.ids.push(c.id)
      existing.dates.push(c.date)
      existing.isRecurring = existing.isRecurring || c.isRecurring
      if (existing.source !== c.source) existing.source = 'manual'
    } else {
      groups.set(key, {
        key,
        reason: c.reason || c.date,
        ids: [c.id],
        dates: [c.date],
        isRecurring: c.isRecurring,
        source: c.source,
      })
    }
  }
  return Array.from(groups.values())
}

function ClosureRow({ group, onEdit, onDelete }: { group: ClosureGroup; onEdit: () => void; onDelete: () => void }) {
  const years = new Set(group.dates.map((d) => d.slice(0, 4)))
  return (
    <div className="flex items-center gap-3 border-t border-border/70 px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-sm font-bold text-foreground">{group.reason}</span>
          {group.isRecurring && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Repeat size={12} />
              כל שנה
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {group.dates.length > 1 ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} />
              {`${group.dates.length} ימים · ${[...years].sort().join(', ')}`}
            </span>
          ) : (
            <span dir="ltr">{group.dates[0]}</span>
          )}
          {group.source === 'hebcal' ? ' · חג' : ''}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`עריכת ${group.reason}`}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Edit3 size={15} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`הסרת ${group.reason}`}
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

/**
 * Every day the studio is closed, searchable, on its own page. It used to be a sub-tab of the AI
 * settings showing three entries and a dialog for the rest; closures are the studio's calendar,
 * which staff look for here, not under the bot.
 */
function ClosuresSettings() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ClosureGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<ClosureGroup | null>(null)
  const [search, setSearch] = useState('')

  const { data: closures = [], isLoading } = useQuery<StudioClosure[]>({ queryKey: ['studio-closures'], queryFn: () => getStudioClosures() })
  const groups = useMemo(() => sortClosureGroups(groupClosures(closures)), [closures])
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? groups.filter((g) => g.reason.toLowerCase().includes(q) || g.dates.some((d) => d.includes(q))) : groups
  }, [groups, search])

  const removeGroup = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => deleteStudioClosure({ data: { id } }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-closures'] })
      setGroupToDelete(null)
    },
  })

  const sortedYears = groupToDelete ? Array.from(new Set(groupToDelete.dates.map((d) => d.slice(0, 4)))).sort() : []

  return (
    <>
      <SettingsSection
        title="מועדים"
        description={groups.length > 0 ? `${groups.length} מועדים. חגים שנוספו מהלוח העברי נסגרים לפי התאריך העברי בכל שנה.` : undefined}
        action={
          <Button type="button" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus size={14} />
            הוספה
          </Button>
        }
        bare
      >
        {groups.length > 5 && <SearchInput size="sm" variant="card" placeholder="חיפוש לפי שם או תאריך (פסח, 2026-10)…" value={search} onChange={setSearch} />}
        <div className="card-native overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">אין ימי סגירה. אפשר להוסיף את החגים בלחיצה אחת.</p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">אין מועד שמתאים לחיפוש.</p>
          ) : (
            visible.map((g) => <ClosureRow key={g.key} group={g} onEdit={() => setEditingGroup(g)} onDelete={() => setGroupToDelete(g)} />)
          )}
        </div>
      </SettingsSection>

      <AddClosureDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditClosureDialog group={editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)} onSaved={() => setEditingGroup(null)} />
      <ConfirmDialog
        open={groupToDelete !== null}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
        title={groupToDelete ? `הסרת "${groupToDelete.reason}"` : ''}
        description={groupToDelete && groupToDelete.dates.length > 1 ? `הסטודיו יחזור להיות פתוח בכל ${groupToDelete.dates.length} הימים.` : 'הסטודיו יחזור להיות פתוח ביום הזה.'}
        details={
          groupToDelete
            ? groupToDelete.dates.length > 1
              ? [{ label: 'שנים', value: sortedYears.join(', ') }]
              : [{ label: 'תאריך', value: <span dir="ltr">{groupToDelete.dates[0]}</span> }]
            : undefined
        }
        tone="destructive"
        confirmLabel="הסרה"
        pendingLabel="מסיר…"
        isPending={removeGroup.isPending}
        onConfirm={() => groupToDelete && removeGroup.mutate(groupToDelete.ids)}
      />
    </>
  )
}

export function ClosuresTab() {
  return (
    <SettingsPage title="ימי סגירה" description="בימים האלה הבוט לא מציע תורים והיומן מסמן אותם כסגורים.">
      <ClosuresSettings />
    </SettingsPage>
  )
}
