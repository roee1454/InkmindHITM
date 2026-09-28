import { useEffect, useState } from 'react'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
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
      title="סימון הפרויקט כאבוד"
      description={`${projectTitle || 'הפרויקט'} יוצא מהלוח הפתוח. אפשר לפתוח אותו מחדש בכל רגע.`}
      footer={
        <DialogActions error={markLost.isError ? (markLost.error instanceof Error ? markLost.error.message : 'הסימון נכשל.') : null}>
          <Button type="button" variant="ghost" disabled={markLost.isPending} onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="button" disabled={markLost.isPending} onClick={submit} className="min-w-28 gap-2">
            {markLost.isPending && <Loader2 size={14} className="animate-spin" />}
            סימון כאבוד
          </Button>
        </DialogActions>
      }
    >
      <div className="form-stack">
        <div className="flex flex-col gap-1.5">
          <label className="form-label">למה הלקוח לא המשיך?</label>
          <Select value={reason} onValueChange={(value) => setReason(value as LostReason)}>
            <SelectTrigger className="w-full" aria-label="סיבה">
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
          <p className="text-xs text-muted-foreground">הסיבה נספרת בניתוח הנשירה במשפך.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lost-note" className="form-label">
            הערה <span className="font-medium text-muted-foreground">(לא חובה)</span>
          </label>
          <Textarea id="lost-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
        </div>
      </div>
    </ResponsiveDialog>
  )
}
