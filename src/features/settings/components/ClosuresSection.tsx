import { useMemo, useState } from 'react'
import { Trash2, Sparkles, Repeat, CalendarDays } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudioClosures, deleteStudioClosure } from '../server/settings'
import type { StudioClosure } from '../server/settings'
import { AddClosureDialog } from './AddClosureDialog'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'

interface ClosureGroup {
  key: string
  reason: string
  ids: string[]
  dates: string[]
  isRecurring: boolean
  source: StudioClosure['source']
}

function groupClosures(closures: StudioClosure[]): ClosureGroup[] {
  const groups = new Map<string, ClosureGroup>()
  for (const c of closures) {
    // Closures without a reason can't be meaningfully merged (nothing ties them together), so
    // each keeps its own group keyed by id instead of collapsing into a shared "no reason" bucket.
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
  return Array.from(groups.values()).sort((a, b) => a.dates[0]!.localeCompare(b.dates[0]!))
}

/** Shared between dashboard Settings → Studio Policy and the onboarding Studio Identity step. */
export function ClosuresSection() {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<ClosureGroup | null>(null)

  const { data: closures = [] } = useQuery<StudioClosure[]>({
    queryKey: ['studio-closures'],
    queryFn: () => getStudioClosures(),
  })

  const groups = useMemo(() => groupClosures(closures), [closures])

  const removeGroupMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => deleteStudioClosure({ data: { id } }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio-closures'] })
      setGroupToDelete(null)
    },
  })

  const sortedYears = groupToDelete
    ? Array.from(new Set(groupToDelete.dates.map((d) => d.slice(0, 4)))).sort()
    : []

  return (
    <div className="flex flex-col gap-2.5 font-assistant">
      <div className="flex items-center justify-between px-1">
        <span className="form-label">ימי סגירה</span>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="cursor-pointer text-[13px] font-extrabold text-primary"
        >
          הוספה
        </button>
      </div>

      <div className="card-native overflow-hidden">
        {groups.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
            לא הוגדרו ימי סגירה
          </div>
        ) : (
          groups.map((g) => {
            const years = new Set(g.dates.map((d) => d.slice(0, 4)))
            return (
              <div key={g.key} className="row-native justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-bold text-foreground">{g.reason}</span>
                  {g.dates.length > 1 ? (
                    <span className="pill gap-1 bg-muted text-muted-foreground">
                      <CalendarDays size={10} /> {years.size} שנים
                    </span>
                  ) : (
                    <span className="font-mono text-[12.5px] text-muted-foreground" dir="ltr">
                      {g.dates[0]}
                    </span>
                  )}
                  {g.isRecurring && (
                    <span className="pill gap-1 bg-primary/10 text-primary">
                      <Repeat size={10} /> לצמיתות
                    </span>
                  )}
                  {g.source === 'hebcal' && (
                    <span className="pill gap-1 bg-amber-500/12 text-amber-600">
                      <Sparkles size={10} /> Hebcal
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setGroupToDelete(g)}
                  className="tap-target shrink-0 text-muted-foreground active:text-destructive"
                  aria-label="הסרה"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })
        )}
      </div>

      <AddClosureDialog open={addOpen} onOpenChange={setAddOpen} />

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
        <div className="flex flex-col gap-3">
          {groupToDelete && groupToDelete.dates.length > 1 && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {[...groupToDelete.dates].sort().map((date) => (
                <div key={date} className="rounded-lg px-2 py-1 font-mono text-[12.5px] text-muted-foreground" dir="ltr">
                  {date}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl font-bold cursor-pointer"
              onClick={() => setGroupToDelete(null)}
            >
              ביטול
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-xl font-bold cursor-pointer"
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
