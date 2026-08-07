import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { getCurrentSession } from '@/features/auth/server/auth'
import { WhatsAppDiagnostics } from '@/features/settings/components/WhatsAppDiagnostics'
import { MessageSquare, ShieldCheck, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/onboarding/whatsapp')({
  loader: () => getCurrentSession(),
  component: WhatsappStep,
})

function WhatsappStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()

  if (!session) return null

  return (
    <div className="space-y-6 text-right font-assistant" dir="rtl">
      {/* Security Notice Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-300">
              אבטחת מידע ופרטיות מלאה
            </h3>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
              פרטי ה-WhatsApp Cloud API מוגדרים אך ורק במשתני סביבה בשרת — אין אפשרות להזין
              אותם דרך המערכת. בדף זה ניתן לוודא שהחיבור מוגדר נכון.
            </p>
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">חיבור WhatsApp Cloud API</h2>
            <p className="text-xs text-muted-foreground">
              סטטוס משתני הסביבה ובדיקת חיבור מול שרתי Meta
            </p>
          </div>
        </div>

        <WhatsAppDiagnostics />
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end pt-2">
        <Button
          onClick={() => navigate({ to: '/onboarding/profile' })}
          className="rounded-xl px-6 font-bold cursor-pointer gap-2"
        >
          <span>המשך לפרופיל</span>
          <ArrowLeft size={16} />
        </Button>
      </div>
    </div>
  )
}
