import { useEffect, useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from '@/components/ui/icon'
import { LOST_REASONS } from '../types'
import type { LostReason } from '../types'
import { LOST_REASON_LABELS } from '../utils/labels'
import { useProjectMilestones } from '../hooks/use-project-milestones'

interface MarkProjectLostDialogProps {
  projectId: string
  projectTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Why the customer didn't go ahead — the reason feeds the funnel's drop-off analysis. */
export function MarkProjectLostDialog({ projectId, projectTitle, open, onOpenChange }: MarkProjectLostDialogProps) {
  const { markLost } = useProjectMilestones()
  const [reason, setReason] = useState<LostReason>('no_response')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setReason('no_response')
    setNote('')
    markLost.reset()
    // Reset when the dialog opens for a project, not whenever the mutation object changes.
  }, [open, projectId])

  const submit = () => markLost.mutate({ projectId, reason, note: note.trim() || undefined }, { onSuccess: () => onOpenChange(false) })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !markLost.isPending && onOpenChange(next)}
      title={`סימון כאבוד — ${projectTitle || 'פרויקט'}`}
      description="אפשר לפתוח את הפרויקט מחדש בכל רגע. פרויקט עם תור עתידי פעיל לא ניתן לסמן כאבוד."
    >
      <div className="flex flex-col gap-4 font-assistant" dir="rtl">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-foreground">סיבה</label>
          <Select value={reason} onValueChange={(value) => setReason(value as LostReason)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {LOST_REASONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {LOST_REASON_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lost-note" className="text-xs font-bold text-foreground">הערה (לא חובה)</label>
          <Textarea id="lost-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
        </div>

        {markLost.isError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {markLost.error instanceof Error ? markLost.error.message : 'הסימון נכשל.'}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={markLost.isPending} onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={markLost.isPending} onClick={submit} className="min-w-28 gap-2">
            {markLost.isPending && <Loader2 size={14} className="animate-spin" />}
            סימון כאבוד
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  )
}
