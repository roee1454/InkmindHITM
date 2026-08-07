import { createFileRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getSettings } from '@/features/onboarding/server/onboarding'
import { User, Clock, MessageSquare, Users, Sparkles, CheckCircle2, CalendarDays, Building2 } from 'lucide-react'

const STEPS = [
  { path: '/onboarding/whatsapp', label: 'WhatsApp', icon: MessageSquare, desc: 'חיבור Cloud API' },
  { path: '/onboarding/profile', label: 'זהות הסטודיו', icon: Building2, desc: 'שם, לוגו ומדיניות' },
  { path: '/onboarding/artist-profile', label: 'פרופיל אמן', icon: User, desc: 'סגנונות וקישורים' },
  { path: '/onboarding/hours', label: 'שעות פעילות', icon: Clock, desc: 'לוח זמנים שבועי' },
  { path: '/onboarding/team', label: 'צוות', icon: Users, desc: 'ניהול חברי צוות' },
  { path: '/onboarding/calendar', label: 'יומנים', icon: CalendarDays, desc: 'חיבור Google Calendar' },
] as const

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) throw redirect({ to: '/auth/login' })
    const settings = await getSettings()
    if (settings?.onboarding_completed) throw redirect({ to: '/dashboard' })
  },
  component: OnboardingLayout,
})

function OnboardingLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeIndex = Math.max(0, STEPS.findIndex((s) => s.path === pathname))
  const currentStep = STEPS[activeIndex] || STEPS[0]
  const progressPercent = Math.round(((activeIndex + 1) / STEPS.length) * 100)

  return (
    <div
      className="relative min-h-svh bg-background font-assistant text-foreground antialiased selection:bg-primary/20 selection:text-primary"
      dir="rtl"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed -top-32 right-1/3 size-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 left-1/4 size-96 rounded-full bg-indigo-500/8 blur-3xl" />

      {/* Gradient top bar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-0.5 bg-gradient-to-l from-primary via-indigo-400 to-primary/40" />

      <div className="relative mx-auto max-w-2xl px-4 py-8 md:py-14">
        {/* Brand + Badge */}
        <div className="mb-8 flex flex-col items-center text-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-lg" />
            <div className="relative flex size-11 items-center justify-center rounded-2xl border-2 border-primary/40 bg-primary text-base font-black text-primary-foreground shadow-md">
              IM
            </div>
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
              <Sparkles size={11} className="animate-pulse" />
              <span>אשף הגדרת מערכת INKMIND</span>
            </div>
            <h1 className="text-xl font-black text-foreground md:text-2xl">הקמת הסטודיו שלך</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              נגדיר יחד את הפרטים הבסיסיים כדי שהעוזר הדיגיטלי שלך יעבוד מושלם
            </p>
          </div>
        </div>

        {/* Progress Card */}
        <div className="mb-8 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-md backdrop-blur-md">
          {/* Step label + percent */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary font-black text-sm text-primary-foreground shadow-sm">
                {activeIndex + 1}
              </div>
              <div>
                <div className="text-sm font-bold text-foreground leading-tight">{currentStep.label}</div>
                <div className="text-[10px] text-muted-foreground">{currentStep.desc}</div>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary font-mono">
              {progressPercent}%
            </span>
          </div>

          {/* Step Indicators */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}
          >
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isDone = i < activeIndex
              const isCurrent = i === activeIndex

              return (
                <div key={step.path} className="flex flex-col items-center gap-1.5">
                  {/* Segment bar */}
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone ? 'bg-emerald-500' : isCurrent ? 'bg-primary' : 'bg-transparent'
                      }`}
                      style={{ width: isDone || isCurrent ? '100%' : '0%' }}
                    />
                  </div>

                  {/* Step icon label */}
                  <div
                    className={`hidden sm:flex min-w-0 items-center gap-1 text-[10px] font-bold transition-colors ${
                      isCurrent
                        ? 'text-primary'
                        : isDone
                          ? 'text-emerald-500'
                          : 'text-muted-foreground/40'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={10} /> : <Icon size={10} />}
                    <span className="truncate">{step.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
