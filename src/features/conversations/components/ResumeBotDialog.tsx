import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Send, AlertCircle, Clock } from '@/components/ui/icon'
import { IMDialogActions, IMResponsiveDialog } from '@/components/ui/responsive-dialog'
import { IMButton } from '@/components/ui/button'
import { IMTextarea } from '@/components/ui/textarea'
import { IMLabel } from '@/components/ui/label'
import { IMCheckbox } from '@/components/ui/checkbox'
import { useIMToast } from '@/components/ui/toast'
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
  const { toast } = useIMToast()
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
    <IMResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="החזרת השיחה לבוט"
      description={`הבוט ימשיך את השיחה עם ${customer}.`}
      footer={
        <IMDialogActions>
          <IMButton type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={resumeMutation.isPending}>
            ביטול
          </IMButton>
          <IMButton type="button" disabled={resumeMutation.isPending} onClick={() => resumeMutation.mutate()} className="min-w-28 gap-1.5">
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
          </IMButton>
        </IMDialogActions>
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
          <IMLabel htmlFor="bot-instruction" className="form-label">
            הנחיה לבוט <span className="font-medium text-muted-foreground">(לא חובה)</span>
          </IMLabel>
          <IMTextarea
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
            <IMCheckbox id="trigger-turn" checked={triggerTurn} onCheckedChange={(checked) => setTriggerTurn(Boolean(checked))} disabled={resumeMutation.isPending} className="mt-0.5" />
            <span className="flex flex-col">
              <span className="text-sm font-bold text-foreground">שהבוט יענה עכשיו</span>
              <span className="text-xs text-muted-foreground">אחרת הוא ימתין להודעה הבאה של הלקוח.</span>
            </span>
          </label>
        )}
      </div>
    </IMResponsiveDialog>
  )
}
