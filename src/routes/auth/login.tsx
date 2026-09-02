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
    <div className="auth-stack">
      <div className="flex flex-col items-center gap-4">
        <BrandMark size="lg" />
        <div className="flex flex-col gap-1.5">
          <h1 className="auth-title">INKMIND CRM</h1>
          <p className="auth-sub">מערכת ניהול סטודיו קעקועים</p>
        </div>
      </div>

      <LoginForm />
    </div>
  )
}