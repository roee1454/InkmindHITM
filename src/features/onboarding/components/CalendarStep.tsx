import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Check, Sparkle, AlertCircle } from '@/components/ui/icon'
import { getCurrentSession } from '@/features/auth/server/auth'
import { completeOnboarding, getOnboardingGaps } from '@/features/onboarding/server/onboarding'
import { useGoogleCalendarOAuth } from '../hooks/useGoogleCalendarOAuth'
import { useOnboardingUiStore } from '../store/onboardingUiStore'
import type { CurrentSession } from '@/features/auth/server/auth'

interface CalendarStepProps {
  session?: CurrentSession | null
}

export function CalendarStep({ session: initialSession }: CalendarStepProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [completeError, setCompleteError] = useState<string | null>(null)
  const fixFromFinish = useOnboardingUiStore((s) => s.fixFromFinish)

  // What is still missing, known before the last click rather than after it.
  const { data: gaps = [] } = useQuery({ queryKey: ['onboarding-gaps'], queryFn: () => getOnboardingGaps(), staleTime: 0 })

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

  const completeMutation = useMutation({
    mutationFn: () => completeOnboarding(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      navigate({ to: '/dashboard' })
    },
    onError: (err: unknown) => {
      setCompleteError(err instanceof Error ? err.message : 'שגיאה בסיום תהליך ההגדרה')
    },
  })

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

      {gaps.length > 0 && (
        <section aria-label="מה חסר לפני הסיום" className="flex flex-col gap-2 rounded-2xl border border-border p-4">
          <h2 className="text-sm font-extrabold text-foreground">חסר עוד משהו לפני הסיום</h2>
          <ul className="flex flex-col divide-y divide-border/70">
            {gaps.map((gap) => (
              <li key={gap.step} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-foreground">{gap.message}</span>
                <button type="button" onClick={() => fixFromFinish(gap.step)} className="shrink-0 cursor-pointer text-sm font-bold text-foreground underline underline-offset-4">
                  למלא עכשיו
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">אחרי המילוי תחזרו ישר לכאן.</p>
        </section>
      )}

      {completeError && (
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertCircle size={18} className="shrink-0" />
          {completeError}
        </p>
      )}

      <div className="flex-1" />

      <div className="step-footer">
        <button
          type="button"
          disabled={completeMutation.isPending || gaps.length > 0}
          onClick={() => completeMutation.mutate()}
          className="btn-native cursor-pointer"
        >
          <Sparkle size={18} />
          <span>{completeMutation.isPending ? 'מסיים…' : 'סיום והתחלת עבודה'}</span>
        </button>

        {!isCalendarConnected && (
          <button
            type="button"
            disabled={completeMutation.isPending || gaps.length > 0}
            onClick={() => completeMutation.mutate()}
            className="cursor-pointer text-center text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            דלג לעת עתה ועבור ללוח הבקרה
          </button>
        )}
      </div>
    </div>
  )
}

