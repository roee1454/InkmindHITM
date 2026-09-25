import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({ component: AuthLayout })

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // /auth/setup renders its own full-bleed OnboardingStepShell (SetupForm does this
  // internally) so it visually matches /onboarding's steps 4–6 — it must not be squeezed
  // into the centred auth-shell card the other /auth/* pages use.
  if (pathname === '/auth/setup') {
    return <Outlet />
  }

  return (
    <div className="auth-shell" dir="rtl">
      <Outlet />
    </div>
  )
}
