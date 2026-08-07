import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { getCurrentSession } from '@/features/auth/server/auth'
import { completeOnboarding } from '@/features/onboarding/server/onboarding'
import { getStaffList } from '@/features/settings/server/staff'
import { GoogleCalendarConnection } from '@/features/settings/components/GoogleCalendarConnection'
import { CalendarDays, ArrowRight, CheckCircle2, Info } from 'lucide-react'

export const Route = createFileRoute('/onboarding/calendar')({
  loader: () => getCurrentSession(),
  component: CalendarStep,
})

function CalendarStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const staffQuery = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
  })

  const finishMutation = useMutation({
    mutationFn: () => completeOnboarding(),
    onSuccess: () => navigate({ to: '/dashboard' }),
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בסיום ההגדרה')
    },
  })

  if (!session) return null

  return (
    <div className="space-y-6 text-right font-assistant" dir="rtl">
      {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}

      {/* Info Banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
            <Info size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">
              סנכרון יומן Google Calendar
            </h3>
            <p className="text-xs text-blue-800/80 dark:text-blue-200/80 leading-relaxed mt-0.5">
              חיבור יומן Google מאפשר לסנכרן תורים דו-כיווני — תורים שנקבעו בסטודיו מופיעים ביומן האישי, וחסימות ביומן נלקחות בחשבון בעת קביעת תורים חדשים.
            </p>
          </div>
        </div>
      </div>

      {/* Calendar Connections per Staff */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">חיבור יומנים לחברי הצוות</h2>
            <p className="text-xs text-muted-foreground">
              לחצו על "חבר יומן Google" עבור כל אמן שרוצה לסנכרן את הלוח שנה שלו
            </p>
          </div>
        </div>

        {staffQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border">
            {(staffQuery.data ?? []).map((member) => (
              <div key={member.id} className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-muted font-bold text-xs text-foreground">
                    {member.name.slice(0, 2) || '??'}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground">{member.name}</span>
                    <span className="mr-2 text-xs text-muted-foreground">{member.email}</span>
                  </div>
                </div>
                <GoogleCalendarConnection
                  staffId={member.id}
                  staffName={member.name}
                  staffRole={member.role}
                  isSelf={member.id === session.staff.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/onboarding/team' })}
          className="rounded-xl px-5 font-bold cursor-pointer gap-2"
        >
          <ArrowRight size={16} />
          <span>חזרה</span>
        </Button>

        <Button
          onClick={() => finishMutation.mutate()}
          disabled={finishMutation.isPending}
          className="rounded-xl px-7 py-2.5 font-bold cursor-pointer gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all hover:scale-[1.02]"
        >
          <CheckCircle2 size={18} />
          <span>{finishMutation.isPending ? 'מסיים הגדרה...' : 'סיום ההגדרה והתחלת עבודה!'}</span>
        </Button>
      </div>
    </div>
  )
}
