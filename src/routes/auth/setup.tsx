import { createFileRoute, redirect } from '@tanstack/react-router'
import { SetupForm } from '@/features/auth/components/SetupForm'
import { needsBootstrap } from '@/features/auth/server/auth'
import { Sparkles } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'

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
    <div className="auth-stack">
      <div className="flex flex-col items-center gap-4">
        <BrandMark size="lg" />
        <div className="flex flex-col gap-1.5">
          <h1 className="auth-title">INKMIND CRM</h1>
          <p className="auth-sub">מערכת ניהול סטודיו קעקועים</p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/8 p-4 text-center shadow-xs">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Sparkles size={15} className="text-primary" />
          <span className="text-[13px] font-bold text-primary">ברוכים הבאים! הגדרה ראשונית</span>
          <Sparkles size={15} className="text-primary" />
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          צרו את חשבון בעל/ת הסטודיו הראשון. לאחר ההרשמה תועברו לאשף הגדרה קצר.
        </p>
      </div>

      <SetupForm />
    </div>
  )
}
