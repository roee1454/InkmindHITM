import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Check, Sparkle, AlertCircle } from '@/components/ui/icon'
import { getCurrentSession } from '@/features/auth/server/auth'
import { completeOnboarding } from '@/features/onboarding/server/onboarding'
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
  const setCurrentStep = useOnboardingUiStore((s) => s.setCurrentStep)

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

  const getFixStep = (error: string): { step: 1 | 2 | 3 | 4 | 5; label: string } | null => {
    if (error.includes('סטודיו') || error.includes('שלב 1')) return { step: 1, label: 'חזרה להגדרת שם הסטודיו (שלב 1)' }
    if (error.includes('טלפון') || error.includes('שלב 2')) return { step: 2, label: 'חזרה להזנת מספר טלפון (שלב 2)' }
    if (error.includes('עבודות') || error.includes('אינסטגרם') || error.includes('שלב 3'))
      return { step: 3, label: 'חזרה להזנת תיק עבודות (שלב 3)' }
    if (error.includes('יום עבודה') || error.includes('שעות') || error.includes('שלב 4'))
      return { step: 4, label: 'חזרה להגדרת שעות פעילות (שלב 4)' }
    if (error.includes('מקדמה') || error.includes('שלב 5')) return { step: 5, label: 'חזרה להגדרת תשלומים ומקדמה (שלב 5)' }
    return null
  }

  const fixStep = completeError ? getFixStep(completeError) : null

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

      {completeError && (
        <div className="flex flex-col gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{completeError}</span>
          </div>
          {fixStep && (
            <button
              type="button"
              onClick={() => setCurrentStep(fixStep.step)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-destructive/15 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/25 transition-colors cursor-pointer"
            >
              <span>{fixStep.label}</span>
            </button>
          )}
        </div>
      )}

      <div className="flex-1" />

      <div className="step-footer">
        <button
          type="button"
          disabled={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
          className="btn-native cursor-pointer"
        >
          <Sparkle size={18} />
          <span>{completeMutation.isPending ? 'מסיים…' : 'סיום והתחלת עבודה'}</span>
        </button>

        {!isCalendarConnected && (
          <button
            type="button"
            disabled={completeMutation.isPending}
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

