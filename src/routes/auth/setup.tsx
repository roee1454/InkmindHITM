import { createFileRoute, redirect } from '@tanstack/react-router'
import { SetupForm } from '@/features/auth/components/SetupForm'
import { needsBootstrap } from '@/features/auth/server/auth'
import { Sparkles } from 'lucide-react'

export const Route = createFileRoute('/auth/setup')({
  beforeLoad: async () => {
    if (!(await needsBootstrap())) {
      throw redirect({ to: '/auth/login' })
    }
  },
  component: SetupPage,
})

function SetupPage() {
  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative mb-3 shrink-0">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          <div className="relative flex size-12 items-center justify-center rounded-2xl border-2 border-primary/40 bg-primary font-assistant text-lg font-black text-primary-foreground shadow-md">
            IM
          </div>
        </div>
        <h1 className="text-2xl font-black text-foreground">INKMIND CRM</h1>
        <p className="mt-1 text-xs text-muted-foreground">מערכת ניהול סטודיו קעקועים חכמה מבוססת AI</p>
      </div>

      {/* Impeccable Welcome Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-center shadow-xs">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Sparkles size={15} className="text-primary" />
          <span className="text-xs font-bold text-primary">ברוכים הבאים! הגדרה ראשונית</span>
          <Sparkles size={15} className="text-primary" />
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          צרו את חשבון בעל/ת הסטודיו הראשון. לאחר ההרשמה תועברו לאשף הגדרה קצר.
        </p>
      </div>

      {/* Card Container */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
        <div className="space-y-1 text-right">
          <h2 className="text-lg font-bold text-foreground">יצירת חשבון ראשי</h2>
          <p className="text-xs text-muted-foreground">הזינו את פרטי בעל/ת הסטודיו שיהיו מנהל/ת המערכת</p>
        </div>
        <SetupForm />
      </div>
    </div>
  )
}
