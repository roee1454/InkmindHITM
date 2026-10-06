import type { getCurrentSession } from '@/features/auth/server/auth'
import type { getSettings } from '@/features/onboarding/server/onboarding'

type DashboardSession = NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>
type DashboardSettings = NonNullable<Awaited<ReturnType<typeof getSettings>>>

let cachedSession: DashboardSession | null = null
let cachedSettings: DashboardSettings | null = null

export function getCachedDashboardData(): { session: DashboardSession; settings: DashboardSettings } | null {
  if (typeof window !== 'undefined' && cachedSession && cachedSettings) {
    return { session: cachedSession, settings: cachedSettings }
  }
  return null
}

export function setCachedDashboardData(session: DashboardSession, settings: DashboardSettings): void {
  if (typeof window !== 'undefined') {
    cachedSession = session
    cachedSettings = settings
  }
}

export function clearSessionCache(): void {
  cachedSession = null
  cachedSettings = null
}

