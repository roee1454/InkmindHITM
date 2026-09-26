import { CalendarDays, ChartBar, Home, MessageSquare, SquareKanban, Users } from '@/components/ui/icon'

export interface NavItem {
  readonly to: string
  readonly label: string
  readonly icon: typeof Home
  readonly exact: boolean
}

const HOME: NavItem = { to: '/dashboard', label: 'בית', icon: Home, exact: true }
const CALENDAR: NavItem = { to: '/dashboard/calendar', label: 'תורים', icon: CalendarDays, exact: false }
// TODO(B6.7): this becomes the combined "צינורת" tab (label + icon unchanged) once
// /dashboard/projects exists — routes to whichever of leads/projects was last open, with an
// in-page switcher at the top. See docs/projects-payments/track-b-infrastructure.md B6.7.
const LEADS: NavItem = { to: '/dashboard/leads', label: 'לידים', icon: SquareKanban, exact: false }
const CUSTOMERS: NavItem = { to: '/dashboard/customers', label: 'לקוחות', icon: Users, exact: false }
const CONVERSATIONS: NavItem = { to: '/dashboard/conversations', label: 'שיחות', icon: MessageSquare, exact: false }
const ANALYTICS: NavItem = { to: '/dashboard/analytics', label: 'אנליטיקות', icon: ChartBar, exact: false }

export interface NavGroup {
  readonly label: string
  readonly items: readonly NavItem[]
}

/**
 * Desktop sidebar grouping, by intent rather than by menu order (track-b B6.6): today's
 * overview, the day-to-day work, the pipeline of work coming in, and the reflective/periodic
 * view. Group labels are hidden when the sidebar is collapsed to its icon-only rail.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  { label: 'היום', items: [HOME] },
  { label: 'עבודה שוטפת', items: [CALENDAR, CONVERSATIONS] },
  { label: 'צינורת', items: [LEADS, CUSTOMERS] },
  { label: 'תובנות', items: [ANALYTICS] },
]

/** Flat view of every primary destination. `routeTitle` and the mobile top bar title read this. */
export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

/**
 * The mobile bottom tab bar (track-b B6.6): capped at 5, the conventional ceiling for a phone's
 * bottom bar. Analytics moves to the drawer — reflective, periodic use, not the moment-to-moment
 * work the other five destinations serve.
 */
export const MOBILE_NAV_ITEMS: readonly NavItem[] = [HOME, CALENDAR, CONVERSATIONS, LEADS, CUSTOMERS]

/** Secondary destinations shown in the mobile drawer, alongside notifications/settings/AI status. */
export const DRAWER_NAV_ITEMS: readonly NavItem[] = [ANALYTICS]

export const SETTINGS_SUB_ITEMS = [
  { id: 'general', label: 'כללי', route: '/dashboard/settings/general' },
  { id: 'team', label: 'צוות', route: '/dashboard/settings/team' },
  { id: 'ai', label: 'סוכן AI', route: '/dashboard/settings/ai' },
  { id: 'system', label: 'מערכת', route: '/dashboard/settings/system' },
] as const

/**
 * Longest-prefix match for the mobile top bar title. Reversed so `/dashboard` (a prefix of
 * every other route) only wins when nothing more specific matches.
 */
export function routeTitle(pathname: string): string {
  if (pathname === '/dashboard/settings') return 'הגדרות'
  const settingsItem = SETTINGS_SUB_ITEMS.find((i) => i.route === pathname)
  if (settingsItem) return settingsItem.label
  if (pathname.startsWith('/dashboard/settings')) return 'הגדרות'
  if (pathname === '/dashboard/setup') return 'השלמת הגדרה'
  if (pathname.startsWith('/dashboard/notifications')) return 'התראות'
  return [...NAV_ITEMS].reverse().find((i) => pathname.startsWith(i.to))?.label ?? 'Inkmind'
}

type SettingsBackTarget =
  | { to: '/dashboard/settings/team'; search: Record<string, never> }
  | { to: '/dashboard/setup' }
  | { to: '/dashboard/settings' }
  | { to: '/dashboard' }

/** Where the `MobileTopBar` back arrow should go for a given location — `null` means "no back
 *  arrow here, show the hamburger menu instead" (e.g. the bare settings menu). */
export function settingsBackTarget(
  pathname: string,
  search: Record<string, unknown>,
  isAdmin = true,
): SettingsBackTarget | null {
  if (pathname === '/dashboard/settings/team' && typeof search.staff === 'string' && search.staff) {
    return { to: '/dashboard/settings/team', search: {} }
  }
  if (!isAdmin && pathname.startsWith('/dashboard/settings')) {
    return { to: '/dashboard' }
  }
  if (pathname === '/dashboard/settings/whatsapp') return { to: '/dashboard/setup' }
  if (pathname !== '/dashboard/settings' && pathname.startsWith('/dashboard/settings')) {
    return { to: '/dashboard/settings' }
  }
  if (pathname === '/dashboard/setup') return { to: '/dashboard' }
  return null
}
