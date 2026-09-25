import { useMemo, useState } from 'react'
import {
  Trash2,
  Edit3,
  Repeat,
  CalendarDays,
  ChevronLeft,
  Plus,
} from '@/components/ui/icon'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudioClosures, deleteStudioClosure } from '@/features/settings/server/settings'
import type { StudioClosure } from '@/features/settings/server/settings'
import { AddClosureDialog } from './AddClosureDialog'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { sortClosureGroups } from '../utils/closureSorting'
import type { ClosureGroup } from '../utils/closureSorting'
import { AllClosuresDialog } from './AllClosuresDialog'
import { EditClosureDialog } from './EditClosureDialog'

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

/** Closures management section used within AI Tab policies */
export function ClosuresSection() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ClosureGroup | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<ClosureGroup | null>(null)

  const { data: closures = [], isLoading } = useQuery<StudioClosure[]>({
    queryKey: ['studio-closures'],
    queryFn: () => getStudioClosures(),
  })

  // Group closures and sort with custom closures prioritized first
  const sortedGroups = useMemo(() => {
    const rawGroups = groupClosures(closures)
    return sortClosureGroups(rawGroups)
  }, [closures])

  const visibleGroups = useMemo(() => sortedGroups.slice(0, 3), [sortedGroups])
  const remainingCount = Math.max(0, sortedGroups.length - 3)

  const removeGroupMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => deleteStudioClosure({ data: { id } }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-closures'] })
      setGroupToDelete(null)
    },
  })

  const sortedYears = groupToDelete
    ? Array.from(new Set(groupToDelete.dates.map((d) => d.slice(0, 4)))).sort()
    : []

  return (
    <div className="flex flex-col gap-2.5 font-assistant" dir="rtl">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">ימי סגירה וחופשות בסטודיו</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            מועדים שבהם הסטודיו סגור והסוכן חוסם קביעת תורים ביומן
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => setAddOpen(true)}
          className="shrink-0 gap-1.5"
        >
          <span>מועד חדש</span>
          <Plus size={16} />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
            טוען ימי סגירה…
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
            לא הוגדרו ימי סגירה
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleGroups.map((g) => {
              const years = new Set(g.dates.map((d) => d.slice(0, 4)))
              return (
                <div key={g.key} className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/20">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{g.reason}</span>
                    {g.dates.length > 1 ? (
                      <span className="pill gap-1 bg-muted text-muted-foreground">
                        <CalendarDays size={10} /> {years.size} שנים
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium tabular-nums" dir="ltr">
                        {g.dates[0]}
                      </span>
                    )}
                    {g.isRecurring && (
                      <span className="pill gap-1 bg-primary/10 text-primary">
                        <Repeat size={10} /> לצמיתות
                      </span>
                    )}
                    {g.source === 'hebcal' ? (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
                        חג
                      </span>
                    ) : (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">
                        התאמה אישית
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingGroup(g)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                      title="עריכת מועד"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupToDelete(g)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                      title="הסרת מועד"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}

            {remainingCount > 0 && (
              <button
                type="button"
                onClick={() => setAllOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 bg-muted/20 p-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5 cursor-pointer"
              >
                <span>+{remainingCount} מועדים סגורים נוספים</span>
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dialog 1: Add Closures */}
      <AddClosureDialog open={addOpen} onOpenChange={setAddOpen} />

      {/* Dialog 2: View All Closures (with Search) */}
      <AllClosuresDialog
        open={allOpen}
        onOpenChange={setAllOpen}
        groups={sortedGroups}
        onEditGroup={(g) => {
          setEditingGroup(g)
        }}
        onDeleteGroup={(g) => {
          setGroupToDelete(g)
        }}
        onAddNew={() => setAddOpen(true)}
      />

      {/* Dialog 3: Edit Closure */}
      <EditClosureDialog
        group={editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
        onSaved={() => setEditingGroup(null)}
      />

      {/* Dialog 4: Confirm Delete */}
      <ResponsiveDialog
        open={groupToDelete !== null}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
        title={groupToDelete ? `הסרת "${groupToDelete.reason}"` : ''}
        description={
          groupToDelete
            ? groupToDelete.dates.length > 1
              ? `הפעולה תמחק את כל ${groupToDelete.dates.length} הרשומות (${sortedYears.join(', ')}) של הסגירה הזו.`
              : `הסרת הסגירה בתאריך ${groupToDelete.dates[0]}.`
            : undefined
        }
      >
        <div className="flex flex-col gap-3 py-1 font-assistant" dir="rtl">
          {groupToDelete && groupToDelete.dates.length > 1 && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {[...groupToDelete.dates].sort().map((date) => (
                <div
                  key={date}
                  className="rounded-lg px-2 py-1 text-xs text-muted-foreground font-medium text-left tabular-nums"
                  dir="ltr"
                >
                  {date}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGroupToDelete(null)}
            >
              ביטול
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeGroupMutation.isPending}
              onClick={() => groupToDelete && removeGroupMutation.mutate(groupToDelete.ids)}
            >
              {removeGroupMutation.isPending ? 'מוחק…' : 'הסר'}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  )
}

export default ClosuresSection

