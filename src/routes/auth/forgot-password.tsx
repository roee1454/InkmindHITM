import { createFileRoute, redirect } from '@tanstack/react-router'
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'
import { getCurrentSession } from '@/features/auth/server/auth'
import { BrandMark } from '@/components/BrandMark'

export const Route = createFileRoute('/auth/forgot-password')({
  beforeLoad: async () => {
    if (await getCurrentSession()) {
      throw redirect({ to: '/' })
    }
  },
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <div className="auth-stack">
      <div className="flex flex-col items-center gap-4">
        <BrandMark size="lg" />
        <div className="flex flex-col gap-1.5">
          <h1 className="auth-title">שכחת סיסמה?</h1>
          <p className="auth-sub">הזינו את כתובת האימייל שלכם ונשלח קישור לאיפוס הסיסמה</p>
        </div>
      </div>

      <ForgotPasswordForm />
    </div>
  )
}
