import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Sparkles } from '@/components/ui/icon'
import { getActiveAppointmentSummary } from '../server/messages'
import type { UIAppointmentSummary, UIConversation } from '../types'

export function BookingActionCard({
  conversation,
}: {
  conversation: UIConversation
}) {
  const { data: appointment } = useQuery<UIAppointmentSummary | null>({
    queryKey: ['appointment-summary', conversation.id],
    queryFn: () => getActiveAppointmentSummary({ data: { conversationId: conversation.id } }),
  })

  const showSketchCompleted = Boolean(
    appointment &&
    appointment.type === 'sketch' &&
    appointment.status === 'completed' &&
    conversation.state === 'WANTS_TO_BOOK'
  )

  if (!showSketchCompleted || !appointment) return null

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card px-3.5 py-3" dir="rtl">
      <div className="hitl-row flex-col items-stretch gap-2 p-2.5 bg-accent-ink/5 border-accent-ink/20">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={15} className="shrink-0 text-accent-ink" />
            <span className="text-sm font-extrabold text-foreground">
              פגישת סקיצה הושלמה{appointment.staffName ? ` (אצל ${appointment.staffName})` : ''}
            </span>
          </div>
          <span className="text-micro font-bold text-accent-ink bg-accent-ink/10 px-2 py-0.5 rounded-full">
            מוכן לתיאום קעקוע
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          הלקוח השלים את פגישת הסקיצה. באפשרותך לקבוע לו תור לקעקוע ישירות ביומן (פרטי הסקיצה והמקדמה יוזנו אוטומטית), או להמתין להודעת הלקוח לתיאום מול הבוט.
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <a
            href={`/dashboard/calendar?new=1&fromSketchId=${appointment.id}`}
            className="hitl-action flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-xs flex items-center justify-center text-center no-underline gap-1.5"
          >
            <CalendarClock size={13} />
            <span>קביעת תור לקעקוע ביומן</span>
          </a>
        </div>
      </div>
    </div>
  )
}

