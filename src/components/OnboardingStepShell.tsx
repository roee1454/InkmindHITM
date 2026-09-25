import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronRight } from '@/components/ui/icon'
import { TOTAL_ONBOARDING_STEPS } from '@/features/onboarding/utils/onboarding-steps'
import { getSettings } from '@/features/onboarding/server/onboarding'

interface OnboardingStepShellProps {
  /** 1–6 across the whole wizard — account creation is 1–3, studio setup is 4–6, or employee steps (1–4). */
  stepNumber: number
  totalSteps?: number
  /** Omit on a step that has nowhere to go back to (step 1). */
  onBack?: () => void
  /** Optional headline for the desktop Brand Panel. */
  headline?: string
  /** Optional list of 3 benefits with checkmarks for the desktop Brand Panel. */
  benefits?: string[]
  children: ReactNode
}

function logoUrl(recordId: string, filename: string): string {
  const base = import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090'
  return `${base}/api/files/settings/${recordId}/${encodeURIComponent(filename)}`
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]
  const second = parts[1]
  if (first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase()
  }
  return (name.slice(0, 2) || 'IM').toUpperCase()
}

const DEFAULT_BENEFITS = [
  'שלושה שלבים קצרים בלבד',
  'אפשר לערוך הכל מאוחר יותר בהגדרות',
  'ההתקדמות נשמרת אוטומטית בכל שלב',
]

/**
 * Shared Onboarding & Invite layout shell.
 * - Mobile (<1024px): Full-screen single column with top progress strip and step counter.
 * - Desktop (>=1024px): Two-panel split screen matching Claude's design:
 *   * Left column: Cobalt blue Brand Panel with Studio Logo/Initials, Headline, Benefits list, and Step indicator.
 *   * Right column: Neutral background with centered form column and rounded progress bar directly above form.
 */
export function OnboardingStepShell({
  stepNumber,
  totalSteps = TOTAL_ONBOARDING_STEPS,
  onBack,
  headline = 'כמה שאלות קצרות,\nוהבוט שלך מוכן\nלעבודה',
  benefits = DEFAULT_BENEFITS,
  children,
}: OnboardingStepShellProps) {
  const percent = Math.min(100, Math.round((stepNumber / totalSteps) * 100))

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings(),
  })

  const studioName = (settings?.studio_name as string) || 'Inkmind'
  const logo = settings?.id && settings?.logo ? logoUrl(settings.id, settings.logo as string) : null
  const initials = getInitials(studioName)

  return (
    <div className="min-h-svh w-full flex flex-col lg:flex-row bg-background font-assistant select-text" dir="ltr">
      {/* -------------------------------------------------------------------------
          1. DESKTOP BRAND PANEL (Left column, shown on lg and up)
          ------------------------------------------------------------------------- */}
      <aside
        className="hidden lg:flex w-[380px] xl:w-[440px] 2xl:w-[480px] shrink-0 min-h-svh bg-primary text-primary-foreground flex-col justify-between p-10 xl:p-14 select-none"
        dir="rtl"
        aria-label="פאנל מיתוג מערכת"
      >
        {/* Top: Studio Logo & Name (Logo image if uploaded, or initials badge placeholder) */}
        <div className="flex items-center gap-3">
          {logo ? (
            <img
              src={logo}
              alt={studioName}
              className="size-10 rounded-full object-cover shadow-xs border border-white/20"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 text-sm font-extrabold text-white shadow-xs backdrop-blur-xs">
              {initials}
            </div>
          )}
          <span className="text-xl font-extrabold text-white tracking-tight">{studioName}</span>
        </div>

        {/* Center: Big Headline & 3 Checkmark Benefits */}
        <div className="my-auto flex flex-col gap-8 py-10">
          <h2 className="text-3xl xl:text-4xl font-extrabold leading-[1.25] text-white tracking-tight whitespace-pre-line">
            {headline}
          </h2>

          <ul className="flex flex-col gap-4">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3 text-base font-semibold text-white/95">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  <Check size={14} weight="bold" />
                </div>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: Step Indicator */}
        <div className="pt-6">
          <span className="text-sm font-bold text-white/70">
            שלב {stepNumber} מתוך {totalSteps}
          </span>
        </div>
      </aside>

      {/* -------------------------------------------------------------------------
          2. FORM PANEL (Right column on desktop, full-width on mobile)
          ------------------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col min-h-svh bg-background overflow-y-auto" dir="rtl">
        {/* Mobile-only Progress Strip (Top-edge) */}
        <div className="lg:hidden step-progress">
          <div className="step-progress-fill" style={{ width: `${percent}%` }} />
        </div>

        {/* Mobile-only Header Row (Back Button & Step Indicator) */}
        <div className="lg:hidden flex h-[52px] w-full shrink-0 items-center justify-between px-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="חזרה"
              className="tap-target text-foreground cursor-pointer"
            >
              <ChevronRight size={22} />
            </button>
          ) : (
            <div className="size-11" />
          )}

          <span className="text-sm font-bold text-muted-foreground">
            שלב {stepNumber} מתוך {totalSteps}
          </span>

          <div className="size-11" />
        </div>

        {/* Form Container: Centered max-w-md column on desktop */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 xl:p-14">
          <div className="w-full max-w-md my-auto flex flex-col">
            {/* Desktop-only Progress Bar directly above the form */}
            <div className="hidden lg:flex items-center gap-3 mb-8 w-full">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="חזרה"
                  className="tap-target text-muted-foreground hover:text-foreground cursor-pointer -ms-2"
                >
                  <ChevronRight size={22} />
                </button>
              )}
              <div className="h-1.5 flex-1 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-native"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Step Form Content */}
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default OnboardingStepShell
