import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Clock } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { useConfirm } from '#/hooks/useConfirm'
import { formatIls } from '@/features/payments/utils/labels'
import { formatShortSlot } from '@/features/projects/utils/format'
import { useThreadActions } from '../hooks/use-thread-actions'
import { appointmentFacts } from '../utils/thread-action'
import type { ThreadAction } from '../utils/thread-action'
import type { UIAppointmentSummary } from '../types'

interface ThreadActionPanelProps {
  action: ThreadAction
  conversationId: string
  appointment: UIAppointmentSummary | null
  receiptImageUrl?: string
  onOpenQuote: () => void
  onOpenReceipt: () => void
  onResumeBot: () => void
}

/** Opens the calendar's create dialog (it reads `new=1`, and `fromSketchId` to continue a sketch). */
function BookLink({ fromSketchId, children }: { fromSketchId?: string; children: ReactNode }) {
  return (
    <Button size="sm" asChild>
      <Link to="/dashboard/calendar" search={{ new: '1', ...(fromSketchId ? { fromSketchId } : {}) } as Record<string, unknown>}>
        {children}
      </Link>
    </Button>
  )
}

/**
 * The HITL row (DESIGN.md §5): the one decision this conversation is waiting on — what, about which
 * appointment, and the action that settles it. The accent border is the state: "a person decides
 * here". While the customer is the one who has to act, it's a quiet line instead.
 */
export function ThreadActionPanel({ action, conversationId, appointment, receiptImageUrl, onOpenQuote, onOpenReceipt, onResumeBot }: ThreadActionPanelProps) {
  const actions = useThreadActions(conversationId, appointment?.id)
  const confirm = useConfirm()
  const facts = appointmentFacts(appointment)

  if (action.kind === 'none') return null

  if (action.kind === 'waiting') {
    const slot = appointment?.date && appointment.timeSlot ? formatShortSlot(`${appointment.date}T${appointment.timeSlot}`) : ''
    return (
      <p role="status" className="flex items-center gap-2 px-4 pt-3 text-sm text-muted-foreground">
        <Clock size={15} className="shrink-0" />
        <span className="min-w-0">
          {action.on === 'health'
            ? 'ממתינים להצהרת הבריאות. הקישור נשלח ללקוח, והשיחה תתקדם לבד כשהטופס יתקבל.'
            : `ממתינים לאישור הסופי של הלקוח${slot ? ` למועד ${slot}` : ''}.`}
        </span>
      </p>
    )
  }

  const confirmDeposit = async () => {
    if (action.kind === 'payment' && !action.hasReceipt) {
      const ok = await confirm({
        title: 'לאשר מקדמה בלי אסמכתה?',
        description: 'לא נמצאה בשיחה תמונה של אסמכתה. האישור מסמן את המקדמה כשולמה ושולח ללקוח אישור סופי עם מועד התור.',
        confirmLabel: 'אישור בכל זאת',
      })
      if (!ok) return
    }
    actions.confirmDeposit.mutate()
  }

  const cancelAppointment = async () => {
    const ok = await confirm({
      title: 'לבטל את התור?',
      description: 'המשבצת ביומן תתפנה, והלקוח יקבל הודעה שהתור בוטל.',
      confirmLabel: 'ביטול התור',
      cancelLabel: 'חזרה',
      variant: 'destructive',
    })
    if (ok) actions.cancelAppointment.mutate()
  }

  const quoteLabel = (isSketch: boolean) => (isSketch ? 'אישור פגישת סקיצה' : 'הצעת מחיר')
  const resumeBot = (
    <Button size="sm" variant="outline" onClick={onResumeBot}>
      החזרה לבוט עם הנחיה
    </Button>
  )

  let title: string
  let detail = facts
  let buttons: ReactNode
  let aside: ReactNode = null

  switch (action.kind) {
    case 'price_offer':
      title = action.isSketch ? 'פגישת סקיצה מחכה לאישור שלך' : 'הבוט מחכה להצעת מחיר'
      buttons = <Button size="sm" onClick={onOpenQuote}>{quoteLabel(action.isSketch)}</Button>
      break
    case 'payment':
      title = action.depositAmount ? `מקדמה של ${formatIls(action.depositAmount)} מחכה לאישור` : 'מקדמה מחכה לאישור'
      detail = [facts, action.hasReceipt ? 'הלקוח שלח אסמכתה' : 'עוד לא התקבלה אסמכתה'].filter(Boolean).join(' · ')
      aside = receiptImageUrl ? (
        <button type="button" onClick={onOpenReceipt} aria-label="פתיחת האסמכתה" className="size-12 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-border transition-colors hover:border-foreground/40">
          <img src={receiptImageUrl} alt="" className="size-full object-cover" />
        </button>
      ) : null
      buttons = (
        <>
          <Button size="sm" onClick={confirmDeposit} disabled={actions.isPending}>
            {actions.confirmDeposit.isPending ? 'מאשר…' : 'אישור המקדמה'}
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenReceipt}>
            {action.hasReceipt ? 'בדיקת האסמכתה' : 'אימות ידני'}
          </Button>
          {action.canAskForClearerReceipt && (
            <Button size="sm" variant="ghost" onClick={() => actions.askForClearerReceipt.mutate()} disabled={actions.isPending}>
              בקשת אסמכתה ברורה
            </Button>
          )}
        </>
      )
      break
    case 'slot_conflict':
      title = 'המועד מתנגש עם תור אחר ביומן'
      buttons = (
        <Button size="sm" onClick={() => actions.confirmAppointmentSlot.mutate()} disabled={actions.isPending}>
          {actions.confirmAppointmentSlot.isPending ? 'מאשר…' : 'אישור המועד בכל זאת'}
        </Button>
      )
      break
    case 'cancel_request':
      title = 'הלקוח ביקש לבטל את התור'
      buttons = (
        <>
          <Button size="sm" variant="destructive" onClick={cancelAppointment} disabled={actions.isPending}>
            {actions.cancelAppointment.isPending ? 'מבטל…' : 'ביטול התור'}
          </Button>
          {resumeBot}
        </>
      )
      break
    case 'sketch_done':
      title = `פגישת הסקיצה הושלמה${action.staffName ? ` אצל ${action.staffName}` : ''}`
      detail = 'אפשר לקבוע את תור הקעקוע. פרטי הסקיצה והמקדמה יעברו אליו.'
      buttons = <BookLink fromSketchId={action.appointmentId}>קביעת תור לקעקוע</BookLink>
      break
    case 'attention':
      title = action.isConsultation ? 'הלקוח צריך ייעוץ' : action.reason ? `הבוט העביר לצוות: ${action.reason}` : 'השיחה מחכה למענה'
      buttons = (
        <>
          {action.next === 'quote' && <Button size="sm" onClick={onOpenQuote}>{quoteLabel(action.isSketch)}</Button>}
          {action.next === 'book' && <BookLink>קביעת תור</BookLink>}
          {resumeBot}
        </>
      )
      break
  }

  return (
    <section aria-label="פעולה נדרשת" className="px-3 pt-3 sm:px-4">
      <div className="flex flex-col gap-3 rounded-xl border border-primary/70 bg-background p-3.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {aside}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-sm font-bold text-foreground">{title}</h2>
            {detail && <p className="text-sm text-muted-foreground tabular-nums">{detail}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:shrink-0 sm:[&>*]:flex-none">{buttons}</div>
      </div>
    </section>
  )
}
