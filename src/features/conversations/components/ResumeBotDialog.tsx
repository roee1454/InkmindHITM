import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Send, AlertCircle, Clock } from '@/components/ui/icon'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/ToastProvider'
import { resumeBotWithInstruction } from '../server/messages'
import { STAFF_REASON_LABELS } from '../utils/labels'
import type { UIConversation } from '../types'
import { formatPhoneForDisplay } from '@/lib/phone'

export { STAFF_REASON_LABELS }

interface ResumeBotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: UIConversation
  windowExpired?: boolean
  onSuccess?: () => void
}

export function ResumeBotDialog({
  open,
  onOpenChange,
  conversation,
  windowExpired = false,
  onSuccess,
}: ResumeBotDialogProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [instruction, setInstruction] = useState('')
  const [triggerTurn, setTriggerTurn] = useState(!windowExpired)

  const reasonLabel = conversation.staffCallReason
    ? STAFF_REASON_LABELS[conversation.staffCallReason] ?? conversation.staffCallReason
    : null

  const resumeMutation = useMutation({
    mutationFn: () =>
      resumeBotWithInstruction({
        data: {
          conversationId: conversation.id,
          instruction: instruction.trim(),
          triggerTurn: !windowExpired && triggerTurn,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
      toast(
        triggerTurn && !windowExpired ? 'הבוט הופעל ומעבד מענה' : 'הבוט הופעל במצב המתנה',
        triggerTurn && !windowExpired
          ? 'ה-AI מייצר מענה ראשוני בהתאם להנחיה'
          : 'השיחה הוחזרה לבוט, יגיב להודעה הבאה של הלקוח',
        'success',
      )
      onOpenChange(false)
      setInstruction('')
      onSuccess?.()
    },
    onError: (err: Error) => {
      toast(
        'הפעלת הבוט נכשלה',
        err.message || 'אירעה שגיאה בעת הפעלת הבוט',
        'error',
      )
    },
  })

  const customer = conversation.customerName || formatPhoneForDisplay(conversation.customerPhone)

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="החזרת השיחה לבוט"
      description={`הבוט ימשיך את השיחה עם ${customer}.`}
      footer={
        <DialogActions>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={resumeMutation.isPending}>
            ביטול
          </Button>
          <Button type="button" disabled={resumeMutation.isPending} onClick={() => resumeMutation.mutate()} className="min-w-28 gap-1.5">
            {resumeMutation.isPending ? (
              'מפעיל…'
            ) : triggerTurn && !windowExpired ? (
              <>
                <Send className="size-3.5" />
                החזרה ומענה עכשיו
              </>
            ) : (
              <>
                <Bot className="size-3.5" />
                החזרה לבוט
              </>
            )}
          </Button>
        </DialogActions>
      }
    >
      <div className="form-stack">
        {reasonLabel && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4 shrink-0" />
            השיחה עברה לצוות כי: <strong className="text-foreground">{reasonLabel}</strong>
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bot-instruction" className="form-label">
            הנחיה לבוט <span className="font-medium text-muted-foreground">(לא חובה)</span>
          </Label>
          <Textarea
            id="bot-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="למשל: אישרתי את הסקיצה, המחיר 600 ₪, להציע תור לשלישי או חמישי."
            className="h-24 resize-none"
            disabled={resumeMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">הלקוח לא רואה את ההנחיה. הבוט משתמש בה כדי לנסח את התשובה ולקבוע תורים.</p>
        </div>

        {windowExpired ? (
          <p className="flex items-start gap-2 text-sm text-warning">
            <Clock className="mt-0.5 size-4 shrink-0" />
            חלון 24 השעות של וואטסאפ נסגר, אז הבוט לא יכול לכתוב ראשון. הוא יענה כשהלקוח יכתוב.
          </p>
        ) : (
          <label htmlFor="trigger-turn" className="flex cursor-pointer items-start gap-2.5">
            <Checkbox id="trigger-turn" checked={triggerTurn} onCheckedChange={(checked) => setTriggerTurn(Boolean(checked))} disabled={resumeMutation.isPending} className="mt-0.5" />
            <span className="flex flex-col">
              <span className="text-sm font-bold text-foreground">שהבוט יענה עכשיו</span>
              <span className="text-xs text-muted-foreground">אחרת הוא ימתין להודעה הבאה של הלקוח.</span>
            </span>
          </label>
        )}
      </div>
    </ResponsiveDialog>
  )
}
