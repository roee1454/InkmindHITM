import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({ component: AuthLayout })

function AuthLayout() {
  return (
    <div className="auth-shell" dir="rtl">
      <Outlet />
    </div>
  )
}
