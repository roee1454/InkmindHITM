import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { CalendarClock, Loader2 } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { simulateLifecycleTick } from '@/features/lifecycle/server/lifecycle-simulation'
import type { LifecyclePlannedAction } from '@/features/lifecycle/server/lifecycle-service'

const PRESETS = [
  { hours: 20, label: '+20 שעות' },
  { hours: 24, label: '+יום' },
  { hours: 48, label: '+יומיים' },
  { hours: 72, label: '+3 ימים' },
  { hours: 24 * 7, label: '+שבוע' },
  { hours: 24 * 14, label: '+שבועיים' },
]

function describeAction(action: LifecyclePlannedAction): string {
  switch (action.kind) {
    case 'message':
      return `הודעת ${action.trigger} ללקוח ${action.customerId}`
    case 'complete_appointment':
      return `סימון התור ${action.appointmentId} כהושלם`
    case 'remind_close_out':
      return `תזכורת לצוות לסגור את הסשן ${action.appointmentId} עם מחיר סופי`
    case 'cancel_stale_pending':
      return `ביטול התור הממתין ${action.appointmentId} (48 שעות)`
    case 'expire_lead':
      return `סגירת הליד הלא פעיל ${action.customerId}`
    case 'transition_conversation':
      return `מעבר השיחה ${action.conversationId} ל-${action.to}`
  }
}

/**
 * Dev tool: shows what the lifecycle engine would do at a simulated "now". Replaces changing the
 * machine's clock, which stamps future dates on everything written meanwhile.
 */
export const AiDevTimeSimulationCard: React.FC = () => {
  const [hoursAhead, setHoursAhead] = React.useState(24)
  const [realRun, setRealRun] = React.useState(false)

  const simulation = useMutation({
    mutationFn: () => simulateLifecycleTick({ data: { hoursAhead, dryRun: !realRun } }),
  })

  if (!import.meta.env.DEV) return null

  const plan = simulation.data?.plan ?? []

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 font-assistant shadow-xs" dir="rtl">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-foreground">
          <CalendarClock size={18} className="text-primary" />
          <h3 className="text-sm font-bold">כלי פיתוח — סימולציית זמן לתזכורות</h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          מריץ את מנוע התזכורות כאילו עכשיו זה מאוחר יותר, בלי לשנות את שעון המחשב (שינוי שעון משבש את המטמון ואת חותמות הזמן).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.hours}
            type="button"
            size="sm"
            variant={hoursAhead === preset.hours ? 'default' : 'outline'}
            onClick={() => setHoursAhead(preset.hours)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <label className="flex items-center gap-3 text-xs text-foreground">
        <Switch checked={realRun} onCheckedChange={setRealRun} />
        <span className={cn(realRun && 'font-bold text-destructive')}>
          {realRun ? 'הרצה אמיתית: הודעות יישלחו ורשומות יעודכנו' : 'הרצת ניסיון בלבד (לא נשלח ולא נשמר דבר)'}
        </span>
      </label>

      <Button
        type="button"
        variant={realRun ? 'destructive' : 'default'}
        size="sm"
        className="self-start gap-2"
        disabled={simulation.isPending}
        onClick={() => simulation.mutate()}
      >
        {simulation.isPending && <Loader2 size={14} className="animate-spin" />}
        הרצת tick בעוד {hoursAhead} שעות
      </Button>

      {simulation.isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {formatDatabaseError(simulation.error, 'הסימולציה נכשלה.')}
        </p>
      )}

      {simulation.isSuccess && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs">
          <p className="font-bold text-foreground">
            {plan.length === 0 ? 'אין פעולות מתוזמנות לזמן הזה.' : `${plan.length} פעולות ${realRun ? 'בוצעו' : 'היו מתבצעות'}:`}
          </p>
          <ul className="flex flex-col gap-1.5">
            {plan.map((action, index) => (
              <li key={index} className="flex flex-col gap-0.5 border-b border-border/50 pb-1.5 last:border-0">
                <span className="text-foreground">{describeAction(action)}</span>
                {action.kind === 'message' && <span className="line-clamp-2 text-muted-foreground">{action.body}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
