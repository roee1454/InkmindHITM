import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Sparkle, AlertCircle, Users } from '@/components/ui/icon'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getStaffList } from '@/features/settings/server/staff'
import type { StaffMember } from '@/features/settings/server/staff'
import { completeOnboarding, getOnboardingGaps } from '@/features/onboarding/server/onboarding'
import { AddStaffDialog } from '@/features/settings/tabs/team/components/AddStaffDialog'
import { useOnboardingUiStore } from '../store/onboardingUiStore'
import type { CurrentSession } from '@/features/auth/server/auth'

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  admin: 'מנהל/ת',
  staff: 'צוות',
}

interface TeamStepProps {
  session?: CurrentSession | null
}

export function TeamStep({ session: initialSession }: TeamStepProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [completeError, setCompleteError] = useState<string | null>(null)
  const [addStaffOpen, setAddStaffOpen] = useState(false)
  const fixFromFinish = useOnboardingUiStore((s) => s.fixFromFinish)

  const { data: gaps = [] } = useQuery({
    queryKey: ['onboarding-gaps'],
    queryFn: () => getOnboardingGaps(),
    staleTime: 0,
  })

  const { data: sessionData } = useQuery({
    queryKey: ['current-session'],
    queryFn: () => getCurrentSession(),
    enabled: !initialSession,
  })

  const session = initialSession ?? sessionData
  const currentStaffId = session?.staff?.id

  const { data: staff = [], isLoading: loadingStaff } = useQuery<StaffMember[]>({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
  })

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
        <h1 className="step-question text-3xl">הזמנת חברי צוות</h1>
        <p className="step-hint">
          אפשר להזמין מקעקעים ומנהלים נוספים להצטרף לסטודיו. כל חבר צוות יקבל קישור אישי להגדרת שעות ויומן.
        </p>
      </div>

      <div className="card-native flex flex-col divide-y divide-border/70 overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-foreground">חברי הצוות בסטודיו</h2>
              <p className="text-xs text-muted-foreground">{staff.length} רשומים</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAddStaffOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>הזמנת איש צוות</span>
          </button>
        </div>

        <div className="flex flex-col divide-y divide-border/70">
          {loadingStaff ? (
            <div className="p-4 text-center text-xs text-muted-foreground">טוען חברי צוות…</div>
          ) : (
            staff.map((member) => {
              const isSelf = member.id === currentStaffId
              return (
                <div key={member.id} className="flex items-center justify-between px-4 py-3 text-start">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="avatar-native size-9 text-sm shrink-0">{member.name.charAt(0)}</span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-bold text-foreground">{member.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                    </div>
                  </div>
                  <div className="shrink-0 ms-2">
                    {member.invitePending ? (
                      <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500">
                        ממתין להרשמה
                      </span>
                    ) : (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        {ROLE_LABELS[member.role] ?? member.role}
                        {isSelf ? ' · את/ה' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {staff.length <= 1 && (
        <p className="text-xs leading-relaxed text-muted-foreground text-center px-2">
          זהו שלב רשות. אם את/ה עובד/ת לבד בסטודיו, אפשר להמשיך ישירות ללוח הבקרה. ניתן להזמין חברי צוות נוספים בכל עת דרך ההגדרות.
        </p>
      )}

      {gaps.length > 0 && (
        <section aria-label="מה חסר לפני הסיום" className="flex flex-col gap-2 rounded-2xl border border-border p-4">
          <h2 className="text-sm font-extrabold text-foreground">חסר עוד משהו לפני הסיום</h2>
          <ul className="flex flex-col divide-y divide-border/70">
            {gaps.map((gap) => (
              <li key={gap.step} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-foreground">{gap.message}</span>
                <button
                  type="button"
                  onClick={() => fixFromFinish(gap.step)}
                  className="shrink-0 cursor-pointer text-sm font-bold text-foreground underline underline-offset-4"
                >
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
          className="btn-native cursor-pointer gap-2"
        >
          <Sparkle size={18} />
          <span>{completeMutation.isPending ? 'מסיים…' : 'סיום והתחלת עבודה'}</span>
        </button>

        {staff.length <= 1 && (
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

      <AddStaffDialog open={addStaffOpen} onOpenChange={setAddStaffOpen} />
    </div>
  )
}
