import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'
import { BrandMark } from '@/components/BrandMark'

const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  return (
    <div className="auth-stack">
      <div className="flex flex-col items-center gap-4">
        <BrandMark size="lg" />
        <div className="flex flex-col gap-1.5">
          <h1 className="auth-title">בחירת סיסמה חדשה</h1>
          <p className="auth-sub">בחרו סיסמה חדשה לחשבון שלכם</p>
        </div>
      </div>

      <ResetPasswordForm token={token} />
    </div>
  )
}
