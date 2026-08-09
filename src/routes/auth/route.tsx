import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({ component: AuthLayout })

function AuthLayout() {
  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background px-4 py-8 font-assistant text-foreground antialiased selection:bg-primary/20 selection:text-primary overflow-hidden" dir="rtl">
      {/* Background ambient glows */}
      <div className="pointer-events-none absolute -top-40 right-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 size-96 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
