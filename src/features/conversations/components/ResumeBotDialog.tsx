import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Send, Sparkles, AlertCircle, Clock } from '@/components/ui/icon'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
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

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="size-5" />
          </div>
          <div>
            <span className="text-lg font-bold">החזרת שליטה לבוט AI</span>
          </div>
        </div>
      }
      description={`המשך שיחה מול הלקוח ${conversation.customerName || formatPhoneForDisplay(conversation.customerPhone)}`}
      contentClassName="max-w-md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={resumeMutation.isPending}
          >
            ביטול
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={resumeMutation.isPending}
            onClick={() => resumeMutation.mutate()}
            className="gap-1.5"
          >
            {resumeMutation.isPending ? (
              'מפעיל...'
            ) : triggerTurn && !windowExpired ? (
              <>
                <Send className="size-3.5" />
                <span>הפעל והמשך שיחה</span>
              </>
            ) : (
              <>
                <Bot className="size-3.5" />
                <span>הפעל בוט</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2 font-assistant" dir="rtl">
        {reasonLabel && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-ink/10 border border-accent-ink/20 text-xs text-accent-ink">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              סיבת ההסלמה הנוכחית: <strong>{reasonLabel}</strong>
            </span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bot-instruction" className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              הנחיה מנחה לבוט (אופציונלי)
            </Label>
            <span className="text-2xs text-muted-foreground">הוראת מפעיל פנימית</span>
          </div>
          <Textarea
            id="bot-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="למשל: אישרתי את הסקיצה, המחיר הוא 600 ש״ח, תציע לו תור ליום שלישי או חמישי הקרוב..."
            className="h-24 resize-none text-sm"
            disabled={resumeMutation.isPending}
          />
          <p className="text-micro text-muted-foreground">
            ההנחיה לא נשלחת כלשונה ללקוח, אלא מנחה את ה-AI בגיבוש המענה והפעלת כלי היומן.
          </p>
        </div>

        {windowExpired ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            <Clock className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">חלון 24 השעות של וואטסאפ פג</p>
              <p className="mt-0.5 opacity-90">
                לא ניתן לשלוח מענה יזום ללקוח עד שישלח הודעה נוספת. הבוט יופעל וימתין להודעה הבאה.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40 border border-border">
            <Checkbox
              id="trigger-turn"
              checked={triggerTurn}
              onCheckedChange={(checked) => setTriggerTurn(Boolean(checked))}
              disabled={resumeMutation.isPending}
            />
            <Label
              htmlFor="trigger-turn"
              className="text-xs font-medium cursor-pointer leading-tight select-none"
            >
              הפעל מענה מיידי של הבוט בוואטסאפ (מומלץ)
            </Label>
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}
