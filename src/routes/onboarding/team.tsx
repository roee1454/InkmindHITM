import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { StaffManager } from '@/features/onboarding/components/StaffManager'
import { getCurrentSession } from '@/features/auth/server/auth'
import { Users, ArrowRight, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/onboarding/team')({
  loader: () => getCurrentSession(),
  component: TeamStep,
})

function TeamStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()

  if (!session) return null

  return (
    <div className="space-y-6 text-right font-assistant" dir="rtl">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">צוות הסטודיו</h2>
            <p className="text-xs text-muted-foreground">
              הוסיפו חברי צוות והגדירו עבורם פרופיל ושעות עבודה. ניתן להוסיף עוד בכל עת מההגדרות.
            </p>
          </div>
        </div>

        <StaffManager currentStaffId={session.staff.id} />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/onboarding/hours' })}
          className="rounded-xl px-5 font-bold cursor-pointer gap-2"
        >
          <ArrowRight size={16} />
          <span>חזרה</span>
        </Button>
        <Button
          onClick={() => navigate({ to: '/onboarding/calendar' })}
          className="rounded-xl px-6 font-bold cursor-pointer gap-2"
        >
          <span>המשך לחיבור יומנים</span>
          <ArrowLeft size={16} />
        </Button>
      </div>
    </div>
  )
}
