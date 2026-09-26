import { CalendarDays, ChartBar, ClipboardList, Home, MessageSquare, SquareKanban, Users } from '@/components/ui/icon'

export interface NavItem {
  readonly to: string
  readonly label: string
  readonly icon: typeof Home
  readonly exact: boolean
  /** Overrides the default `pathname.startsWith(to)` (or `=== to` when `exact`) active check —
   *  used by the mobile bottom bar's combined pipeline tab, which reads as active on either of
   *  two routes. `MobileBottomNav` is the only reader; `Link`'s own matching handles everyone else. */
  readonly activeMatch?: (pathname: string) => boolean
}

const HOME: NavItem = { to: '/dashboard', label: 'בית', icon: Home, exact: true }
const CALENDAR: NavItem = { to: '/dashboard/calendar', label: 'תורים', icon: CalendarDays, exact: false }
const LEADS: NavItem = { to: '/dashboard/leads', label: 'לידים', icon: ClipboardList, exact: false }
const PROJECTS: NavItem = { to: '/dashboard/projects', label: 'פרויקטים', icon: SquareKanban, exact: false }
const CUSTOMERS: NavItem = { to: '/dashboard/customers', label: 'לקוחות', icon: Users, exact: false }
const CONVERSATIONS: NavItem = { to: '/dashboard/conversations', label: 'שיחות', icon: MessageSquare, exact: false }
const ANALYTICS: NavItem = { to: '/dashboard/analytics', label: 'אנליטיקות', icon: ChartBar, exact: false }

/**
 * The mobile bottom bar's one slot for both pipeline pages (track-b B6.7): leads and projects
 * are separate sidebar links on desktop, but a phone's 5-tab cap can't afford two. Defaults to
 * the projects pipeline; `PipelineMobileSwitch` (rendered on both pages) flips to leads.
 */
const PIPELINE_MOBILE: NavItem = {
  to: '/dashboard/projects',
  label: 'צינורת',
  icon: SquareKanban,
  exact: false,
  activeMatch: (pathname) => pathname.startsWith('/dashboard/projects') || pathname.startsWith('/dashboard/leads'),
}

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
  { label: 'צינורת', items: [LEADS, PROJECTS, CUSTOMERS] },
  { label: 'תובנות', items: [ANALYTICS] },
]

/** Flat view of every primary destination. `routeTitle` and the mobile top bar title read this. */
export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

/**
 * The mobile bottom tab bar (track-b B6.6/B6.7): capped at 5, the conventional ceiling for a
 * phone's bottom bar. Analytics moves to the drawer, and leads+projects share one combined slot.
 */
export const MOBILE_NAV_ITEMS: readonly NavItem[] = [HOME, CALENDAR, CONVERSATIONS, PIPELINE_MOBILE, CUSTOMERS]

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
