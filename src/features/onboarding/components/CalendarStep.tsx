import { useQuery } from '@tanstack/react-query'
import { Calendar, Check } from '@/components/ui/icon'
import { getCurrentSession } from '@/features/auth/server/auth'
import { useGoogleCalendarOAuth } from '../hooks/useGoogleCalendarOAuth'
import { useOnboardingUiStore } from '../store/onboardingUiStore'
import type { CurrentSession } from '@/features/auth/server/auth'

interface CalendarStepProps {
  session?: CurrentSession | null
}

export function CalendarStep({ session: initialSession }: CalendarStepProps) {
  const nextStep = useOnboardingUiStore((s) => s.nextStep)

  const { data: sessionData } = useQuery({
    queryKey: ['current-session'],
    queryFn: () => getCurrentSession(),
    enabled: !initialSession,
  })

  const session = initialSession ?? sessionData
  const staffId = session?.staff?.id

  const {
    isCalendarConnected,
    connectingCalendar,
    calendarError,
    handleConnectGoogle,
  } = useGoogleCalendarOAuth(staffId)

  return (
    <div className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">חיבור ליומן Google</h1>
        <p className="step-hint">
          סנכרון דו-כיווני מונע התנגשויות בין תורים בסטודיו לבין היומן האישי שלך.
        </p>
      </div>

      <div className="card-native flex flex-col items-center gap-4 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Calendar size={28} />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-foreground">
            {isCalendarConnected ? 'היומן מחובר ומסונכרן!' : 'סנכרון תורים אוטומטי'}
          </h2>
          <p className="max-w-xs text-xs text-muted-foreground">
            {isCalendarConnected
              ? 'היומן שלך מסונכרן כעת עם המערכת והבוט של הסטודיו.'
              : 'תורים שיקבעו ייכנסו ליומן שלך אוטומטית, וזמנים תפוסים יחסמו מפני הבוט.'}
          </p>
        </div>

        {calendarError && <p className="text-xs font-bold text-destructive">{calendarError}</p>}

        {!isCalendarConnected ? (
          <button
            type="button"
            disabled={connectingCalendar || !staffId}
            onClick={handleConnectGoogle}
            className="btn-native w-full max-w-xs cursor-pointer gap-2"
          >
            <Calendar size={18} />
            <span>{connectingCalendar ? 'מתחבר…' : 'התחברות ליומן Google'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-status-done/10 px-4 py-2 text-sm font-bold text-status-done">
            <Check size={18} />
            <span>מחובר בהצלחה</span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="step-footer">
        <button
          type="button"
          onClick={nextStep}
          className="btn-native cursor-pointer gap-2"
        >
          <Check size={18} />
          <span>אישור והמשך להזמנת צוות</span>
        </button>

        {!isCalendarConnected && (
          <button
            type="button"
            onClick={nextStep}
            className="cursor-pointer text-center text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            דלג לשלב הבא
          </button>
        )}
      </div>
    </div>
  )
}

