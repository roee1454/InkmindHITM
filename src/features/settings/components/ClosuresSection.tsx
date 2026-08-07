import { useState } from 'react'
import { Trash2, Plus, Sparkles, Repeat } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudioClosures, deleteStudioClosure } from '../server/settings'
import type { StudioClosure } from '../server/settings'
import { AddClosureDialog } from './AddClosureDialog'
import { useConfirm } from '@/hooks/use-confirm'

/** Shared between dashboard Settings → Studio Policy and the onboarding Studio Identity step. */
export function ClosuresSection() {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [addOpen, setAddOpen] = useState(false)

  const { data: closures = [] } = useQuery<StudioClosure[]>({
    queryKey: ['studio-closures'],
    queryFn: () => getStudioClosures(),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteStudioClosure({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studio-closures'] }),
  })

  const handleRemove = async (closure: StudioClosure) => {
    const ok = await confirm({
      title: 'הסרת יום סגירה',
      description: closure.reason
        ? `הסרת הסגירה בתאריך ${closure.date} (${closure.reason}).`
        : `הסרת הסגירה בתאריך ${closure.date}.`,
      confirmLabel: 'הסר',
      variant: 'destructive',
    })
    if (ok) removeMutation.mutate(closure.id)
  }

  return (
    <div className="grid grid-cols-1 gap-6 py-6 font-assistant lg:grid-cols-12">
      <div className="space-y-1 lg:col-span-5">
        <h3 className="text-sm md:text-base font-bold text-foreground">ימי סגירה של הסטודיו</h3>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          תאריכים שבהם הסטודיו סגור (חגים, חופשות). הבוט וצוות הסטודיו לא יוכלו לקבוע תורים בתאריכים אלה.
        </p>
      </div>

      <div className="space-y-3 lg:col-span-7">
        {closures.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">לא הוגדרו ימי סגירה.</p>
        ) : (
          <ul className="space-y-1.5">
            {closures.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-foreground" dir="ltr">
                    {c.date}
                  </span>
                  {c.reason && <span className="text-muted-foreground">{c.reason}</span>}
                  {c.isRecurring && (
                    <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <Repeat size={10} /> לצמיתות
                    </span>
                  )}
                  {c.source === 'hebcal' && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                      <Sparkles size={10} /> Hebcal
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(c)}
                  className="shrink-0 cursor-pointer text-rose-400 hover:text-rose-300"
                  aria-label="הסרה"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs font-bold text-muted-foreground transition-all hover:border-primary hover:text-primary"
        >
          <Plus size={14} />
          <span>הוספת יום סגירה</span>
        </button>

        <AddClosureDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    </div>
  )
}

export default ClosuresSection
