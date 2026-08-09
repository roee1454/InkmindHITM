import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { getCurrentSession, needsBootstrap } from '@/features/auth/server/auth'
import { BrandMark } from '@/components/BrandMark'

export const Route = createFileRoute('/auth/login')({
  beforeLoad: async () => {
    if (await needsBootstrap()) {
      throw redirect({ to: '/auth/setup' })
    }
    if (await getCurrentSession()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center text-center">
        <BrandMark size="lg" className="mb-3" />
        <h1 className="text-2xl font-black text-foreground">INKMIND CRM</h1>
        <p className="mt-1 text-xs text-muted-foreground">מערכת הנהלת סטודיו וניהול לקוחות חכמה</p>
      </div>

      {/* Card Container */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-xl backdrop-blur-md space-y-6">
        <div className="space-y-1 text-right">
          <h2 className="text-lg font-bold text-foreground">התחברות למערכת</h2>
          <p className="text-xs text-muted-foreground">הזינו את פרטי החשבון שלכם כדי להיכנס</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
