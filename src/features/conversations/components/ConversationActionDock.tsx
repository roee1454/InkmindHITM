import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  HandCoins,
  Receipt,
  CheckCircle2,
  CalendarCheck,
  CalendarX,
  ShieldCheck,
  AlertTriangle,
  Bot,
  UserCheck,
  CalendarClock,
} from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { confirmSlot } from '@/features/calendar/server/appointments'
import {
  confirmDepositReceived,
  rejectDepositReceipt,
  staffConfirmCancellation,
  takeOverConversation,
} from '../server/messages'
import { useToast } from '@/components/ui/ToastProvider'
import { STAFF_REASON_LABELS } from '../utils/labels'
import type { UIAppointmentSummary, UIConversation } from '../types'

interface ConversationActionDockProps {
  conversation: UIConversation
  appointment: UIAppointmentSummary | null
  receiptImageUrl?: string
  onOpenQuoteSheet: () => void
  onOpenReceiptSheet: () => void
  onResumeBot?: () => void
}

export function ConversationActionDock({
  conversation,
  appointment,
  receiptImageUrl,
  onOpenQuoteSheet,
  onOpenReceiptSheet,
  onResumeBot,
}: ConversationActionDockProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [warnReceiptOpen, setWarnReceiptOpen] = useState(false)

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['active-appointment', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['appointment-summary', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  const confirmDepositMutation = useMutation({
    mutationFn: () => confirmDepositReceived({ data: { conversationId: conversation.id } }),
    onSuccess: () => {
      toast('המקדמה אושרה והודעת סיכום נשלחה ללקוח', 'success')
      invalidateAll()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'אישור המקדמה נכשל', 'error')
    },
  })

  const rejectReceiptMutation = useMutation({
    mutationFn: () => rejectDepositReceipt({ data: { conversationId: conversation.id } }),
    onSuccess: () => {
      toast('נשלחה ללקוח בקשה לאסמכתה ברורה יותר', 'info')
      invalidateAll()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'דחיית האסמכתה נכשלה', 'error')
    },
  })

  const confirmSlotMutation = useMutation({
    mutationFn: () => {
      if (!appointment?.id) throw new Error('אין תור שמור לאישור')
      return confirmSlot({ data: { appointmentId: appointment.id } })
    },
    onSuccess: () => {
      toast('המועד אושר ביומן', 'success')
      invalidateAll()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'אישור המועד נכשל', 'error')
    },
  })

  const cancelAppointmentMutation = useMutation({
    mutationFn: () =>
      staffConfirmCancellation({
        data: {
          conversationId: conversation.id,
          appointmentId: appointment?.id,
        },
      }),
    onSuccess: () => {
      toast('התור בוטל בהצלחה ונשלחה הודעה ללקוח', 'info')
      invalidateAll()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'ביטול התור נכשל', 'error')
    },
  })

  const takeOverMutation = useMutation({
    mutationFn: () => takeOverConversation({ data: { conversationId: conversation.id } }),
    onSuccess: () => {
      toast('השיחה הועברה לטיפולך הידני', 'info')
      invalidateAll()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'ההשתלטות נכשלה', 'error')
    },
  })

  const isPending =
    confirmDepositMutation.isPending ||
    rejectReceiptMutation.isPending ||
    confirmSlotMutation.isPending ||
    cancelAppointmentMutation.isPending ||
    takeOverMutation.isPending

  // 1. Stage: AWAIT_PRICE_OFFER
  if (conversation.state === 'AWAIT_PRICE_OFFER') {
    // Fallback to conversation.tattooInfo so button label is correct before appointment loads
    const isSketch =
      appointment?.type === 'sketch' ||
      (conversation as UIConversation & { tattooInfo?: { appointmentType?: string } }).tattooInfo?.appointmentType === 'sketch'
    return (
      <div className="space-y-3 p-3.5 border-t border-border bg-card/95 backdrop-blur-md" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-ink/10 text-accent-ink">
            <Sparkles size={16} />
          </span>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-black text-foreground">
              {isSketch ? 'נדרש אישור ושריון פגישת סקיצה' : 'נדרשת הצעת מחיר לתור'}
            </span>
            <span className="text-micro text-muted-foreground truncate">
              {appointment ? `${appointment.date} בשעה ${appointment.timeSlot}${appointment.staffName ? ` • ${appointment.staffName}` : ''}` : 'הגדר טווח מחירים או אשר פגישת סקיצה'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onOpenQuoteSheet}
            className="flex-1 h-10 rounded-xl font-black text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            <Sparkles size={14} />
            <span>{isSketch ? 'אשר ושריין פגישת סקיצה' : 'הגדר טווח מחיר ומקדמה'}</span>
          </Button>
        </div>
      </div>
    )
  }

  // 2. Stage: AWAIT_HEALTH_NOTICE (Waiting for customer to fill digital health declaration)
  if (conversation.state === 'AWAIT_HEALTH_NOTICE') {
    return (
      <div className="p-3.5 border-t border-border bg-card/95 backdrop-blur-md font-assistant" dir="rtl">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <ShieldCheck size={16} />
          </span>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-black text-foreground">
              ממתין למילוי טופס הצהרת בריאות דיגיטלי
            </span>
            <span className="text-micro text-muted-foreground truncate">
              הקישור נשלח ללקוח בוואטסאפ. המערכת תתעדכן אוטומטית ותעבור לשלב הבא עם קבלת הטופס החתום.
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 3. Stage: AWAIT_PAYMENT
  if (conversation.state === 'AWAIT_PAYMENT') {
    const depositAmount = appointment?.depositAmount ?? 150
    return (
      <div className="space-y-3 p-3.5 border-t border-border bg-card/95 backdrop-blur-md" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-status-done/10 text-status-done">
            <HandCoins size={16} />
          </span>
          <div className="flex flex-col text-right min-w-0 flex-1">
            <span className="text-xs font-black text-foreground">
              ממתין לתשלום מקדמה (₪{depositAmount})
            </span>
            <span className="text-micro text-muted-foreground truncate">
              {receiptImageUrl ? 'התקבלה אסמכתה בתמונה לבדיקה' : 'הלקוח קיבל פרטי תשלום, אשר לאחר קבלת המקדמה'}
            </span>
          </div>
          {/* Receipt thumbnail — click to open receipt sheet */}
          {receiptImageUrl && (
            <button
              type="button"
              onClick={onOpenReceiptSheet}
              className="shrink-0 size-10 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-zoom-in"
              title="לחץ לצפייה באסמכתה"
            >
              <img src={receiptImageUrl} alt="אסמכתה" className="size-full object-cover" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!receiptImageUrl) {
                setWarnReceiptOpen(true)
              } else {
                confirmDepositMutation.mutate()
              }
            }}
            className="flex-1 min-w-[140px] h-10 rounded-xl font-black text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>{confirmDepositMutation.isPending ? 'מאשר…' : 'אשר קבלת מקדמה'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onOpenReceiptSheet}
            className="h-10 px-3.5 rounded-xl font-extrabold text-xs gap-1.5 border-border hover:bg-accent cursor-pointer"
          >
            <Receipt size={14} className="text-primary" />
            <span>{receiptImageUrl ? 'בדוק אסמכתה' : 'אימות ידני'}</span>
          </Button>

          {conversation.staffCallReason === 'receipt_verification' && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => rejectReceiptMutation.mutate()}
              className="h-10 px-3 rounded-xl font-extrabold text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
            >
              <span>בקש אסמכתה ברורה</span>
            </Button>
          )}
        </div>

        <ResponsiveDialog
          open={warnReceiptOpen}
          onOpenChange={setWarnReceiptOpen}
          title="אישור מקדמה ללא אסמכתה"
          description="לא זוהתה תמונת אסמכתה שנשלחה מהלקוח בשיחה זו."
        >
          <div className="space-y-4 pt-2" dir="rtl">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-accent-ink/10 border border-accent-ink/20 text-accent-ink text-xs">
              <AlertTriangle className="size-5 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                אישור ללא אסמכתה יסמן את המקדמה כשולמה וישלח ללקוח אישור סופי עם מועד התור. האם אתה בטוח שברצונך לאשר ידנית?
              </span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWarnReceiptOpen(false)}
                className="flex-1 rounded-xl h-10 font-bold cursor-pointer"
              >
                ביטול
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setWarnReceiptOpen(false)
                  confirmDepositMutation.mutate()
                }}
                className="flex-1 rounded-xl h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                אישור בכל זאת
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>
    )
  }

  // 4. Stage: AWAIT_FINAL_CONFIRMATION (Waiting for customer's final confirmation on WhatsApp)
  if (conversation.state === 'AWAIT_FINAL_CONFIRMATION') {
    return (
      <div className="p-3.5 border-t border-border bg-card/95 backdrop-blur-md font-assistant" dir="rtl">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <CalendarClock size={16} />
          </span>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-black text-foreground">
              ממתין לאישור סופי של מועד התור מהלקוח
            </span>
            <span className="text-micro text-muted-foreground truncate">
              {appointment
                ? `${appointment.date} בשעה ${appointment.timeSlot}${appointment.staffName ? ` • ${appointment.staffName}` : ''} — הודעת סיכום נשלחה ללקוח, התור יינעל עם אישורו.`
                : 'הודעת סיכום נשלחה ללקוח בוואטסאפ, התור יינעל עם אישורו.'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 5. Staff Call Reason: Slot Conflict
  if (conversation.staffCallReason === 'slot_conflict' && appointment) {
    return (
      <div className="space-y-3 p-3.5 border-t border-border bg-card/95 backdrop-blur-md font-assistant" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <CalendarCheck size={16} />
          </span>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-black text-destructive">
              התנגשות משבצת ביומן
            </span>
            <span className="text-micro text-muted-foreground truncate">
              {appointment.date} בשעה {appointment.timeSlot}{appointment.staffName ? ` • ${appointment.staffName}` : ''}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            disabled={isPending || !appointment}
            onClick={() => confirmSlotMutation.mutate()}
            className="flex-1 h-10 rounded-xl font-black text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            <CalendarCheck size={15} />
            <span>{confirmSlotMutation.isPending ? 'מאשר…' : 'אשר מועד סופי וסגור תור'}</span>
          </Button>
        </div>
      </div>
    )
  }

  // 6. Staff Call Reason: Cancel Request
  if (conversation.staffCallReason === 'cancel_request') {
    return (
      <div className="space-y-3 p-3.5 border-t border-border bg-card/95 backdrop-blur-md font-assistant" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <CalendarX size={16} />
          </span>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-black text-destructive">
              בקשת ביטול תור מהלקוח
            </span>
            <span className="text-micro text-muted-foreground truncate">
              הלקוח ביקש לבטל את התור בשיחה. אישור ישחרר את המשבצת ביומן.
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => cancelAppointmentMutation.mutate()}
            className="flex-1 h-10 rounded-xl font-black text-xs gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs cursor-pointer"
          >
            <CalendarX size={15} />
            <span>{cancelAppointmentMutation.isPending ? 'מבטל…' : 'אשר ביטול תור ושחרר משבצת'}</span>
          </Button>
        </div>
      </div>
    )
  }

  // 7. Escalated / Consultation / Staff Attention
  if (conversation.status === 'escalated' || conversation.staffCallReason) {
    const reasonLabel = conversation.staffCallReason
      ? STAFF_REASON_LABELS[conversation.staffCallReason] || conversation.staffCallReason
      : 'דרוש מענה'
    const isConsultation = conversation.staffCallReason === 'consultation_alert'

    return (
      <div className="space-y-3 p-3.5 border-t border-border bg-card/95 backdrop-blur-md font-assistant" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-ink/10 text-accent-ink">
            <Sparkles size={16} />
          </span>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-black text-foreground">
              {isConsultation ? 'דרוש ייעוץ מקצועי ללקוח' : `בטיפול צוות: ${reasonLabel}`}
            </span>
            <span className="text-micro text-muted-foreground truncate">
              {isConsultation
                ? 'הלקוח זקוק לייעוץ לתיאום פגישה או סקיצה. באפשרותך לתאם ייעוץ, להשתלט או להחזיר לבוט.'
                : 'השיחה הועברה לטיפול צוות. באפשרותך להשתלט, לקבוע תור או להחזיר לבוט.'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {appointment && appointment.status !== 'confirmed' && conversation.state !== 'AWAITING_APPOINTMENT' ? (
            <Button
              type="button"
              onClick={onOpenQuoteSheet}
              className="flex-1 min-w-[130px] h-10 rounded-xl font-black text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              <Sparkles size={14} />
              <span>{appointment.type === 'sketch' ? 'תיאום ושריון פגישת סקיצה' : 'הגדרת מחיר ומקדמה לתור'}</span>
            </Button>
          ) : !appointment ? (
            <Button
              type="button"
              asChild
              className="flex-1 min-w-[130px] h-10 rounded-xl font-black text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              <a href="/dashboard/calendar?new=1">
                <CalendarClock size={14} />
                <span>קביעת תור ביומן</span>
              </a>
            </Button>
          ) : null}

          {onResumeBot && (
            <Button
              type="button"
              variant="outline"
              onClick={onResumeBot}
              className="h-10 px-3 rounded-xl font-extrabold text-xs gap-1.5 border-border hover:bg-accent cursor-pointer"
            >
              <Bot size={14} className="text-primary" />
              <span>החזר לבוט עם הנחיה</span>
            </Button>
          )}

          {conversation.status !== 'staff_handling' && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => takeOverMutation.mutate()}
              className="h-10 px-3 rounded-xl font-extrabold text-xs gap-1.5 border-border hover:bg-accent cursor-pointer"
            >
              <UserCheck size={14} />
              <span>{takeOverMutation.isPending ? 'משתלט…' : 'השתלטות וטיפול'}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            asChild
            className="h-10 px-3 rounded-xl font-extrabold text-xs gap-1 border-border hover:bg-accent cursor-pointer"
          >
            <a href="/dashboard/calendar">
              <CalendarClock size={13} />
              <span>יומן</span>
            </a>
          </Button>
        </div>
      </div>
    )
  }

  return null
}
