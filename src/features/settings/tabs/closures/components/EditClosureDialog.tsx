import React, { useEffect, useState } from 'react'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateStudioClosureGroup } from '@/features/settings/server/closures'
import type { ClosureGroup } from '../utils/closureSorting'

export interface EditClosureDialogProps {
  group: ClosureGroup | null
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export const EditClosureDialog: React.FC<EditClosureDialogProps> = ({
  group,
  onOpenChange,
  onSaved,
}) => {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (group) {
      setReason(group.reason || '')
      setDate(group.dates.length === 1 ? group.dates[0] || '' : '')
      setError(null)
    }
  }, [group])

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!group) throw new Error('No closure group selected')
      return updateStudioClosureGroup({
        data: {
          ids: group.ids,
          reason: reason.trim(),
          date: group.dates.length === 1 && date ? date : undefined,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio-closures'] })
      onSaved?.()
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון המועד')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    updateMutation.mutate()
  }

  const isSingleDate = (group?.dates.length ?? 0) === 1

  return (
    <ResponsiveDialog
      open={Boolean(group)}
      onOpenChange={onOpenChange}
      title="עריכת ימי סגירה"
      description={isSingleDate ? undefined : `${group?.dates.length} ימים. השם החדש יחול על כולם.`}
      footer={
        <DialogActions>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" form="edit-closure-form" disabled={!reason.trim() || updateMutation.isPending} className="min-w-28">
            {updateMutation.isPending ? 'שומר…' : 'שמירה'}
          </Button>
        </DialogActions>
      }
    >
      <form id="edit-closure-form" onSubmit={handleSubmit} className="form-stack" dir="rtl">
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="closure-reason" className="form-label">
            סיבה
          </label>
          <Input id="closure-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="למשל: שיפוצים" required />
        </div>

        {isSingleDate && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="closure-date" className="form-label">
              תאריך
            </label>
            <Input id="closure-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required dir="ltr" className="text-start" />
          </div>
        )}
      </form>
    </ResponsiveDialog>
  )
}
