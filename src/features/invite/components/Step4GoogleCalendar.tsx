import { useNavigate } from '@tanstack/react-router'
import { Calendar, Check, Sparkle } from '@/components/ui/icon'
import { useGoogleCalendarOAuth } from '../hooks/useGoogleCalendarOAuth'

export function Step4GoogleCalendar() {
  const navigate = useNavigate()
  const {
    isCalendarConnected,
    connectingCalendar,
    calendarError,
    handleConnectGoogle,
  } = useGoogleCalendarOAuth()

  return (
    <div className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">חיבור ליומן Google</h1>
        <p className="step-hint">
          סנכרון דו-כיווני מונע התנגשויות בין תורים בסטודיו לבין היומן האישי שלך.
        </p>
      </div>

      <div className="card-native p-5 flex flex-col gap-4 items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Calendar size={28} />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-foreground">
            {isCalendarConnected ? 'היומן מחובר ומסונכרן!' : 'סנכרון תורים אוטומטי'}
          </h2>
          <p className="text-xs text-muted-foreground max-w-xs">
            {isCalendarConnected
              ? 'היומן האישי שלך מסונכרן כעת עם המערכת והבוט של הסטודיו.'
              : 'תורים שיקבעו ייכנסו ליומן שלך אוטומטית, וזמנים תפוסים יחסמו מפני הבוט.'}
          </p>
        </div>

        {calendarError && (
          <p className="text-xs font-bold text-destructive">{calendarError}</p>
        )}

        {!isCalendarConnected ? (
          <button
            type="button"
            disabled={connectingCalendar}
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
          onClick={() => navigate({ to: '/dashboard' })}
          className="btn-native cursor-pointer"
        >
          <Sparkle size={18} />
          <span>סיום והתחלת עבודה</span>
        </button>
        {!isCalendarConnected && (
          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' })}
            className="cursor-pointer text-center text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            דלג לעת עתה ועבור ללוח הבקרה
          </button>
        )}
      </div>
    </div>
  )
}

