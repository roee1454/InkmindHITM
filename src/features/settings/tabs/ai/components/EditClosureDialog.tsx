import React, { useEffect, useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
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
      title="עריכת מועד סגירה"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-assistant pt-2" dir="rtl">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">סיבת הסגירה / תיאור</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="למשל: יום שיפוצים, אירוע פרטי"
            required
            dir="rtl"
          />
        </div>

        {isSingleDate && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">תאריך</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              dir="ltr"
              className="text-start"
            />
          </div>
        )}

        {!isSingleDate && (
          <p className="text-xs text-muted-foreground">
            מועד זה כולל {group?.dates.length} ימים רציפים. עריכת השם תחול על כל הימים בקבוצה.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" disabled={!reason.trim() || updateMutation.isPending}>
            {updateMutation.isPending ? 'שומר…' : 'שמור שינויים'}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}

