import { CalendarDays, Home, MessageSquare, SquareKanban, Users } from 'lucide-react'

/**
 * Single source of truth for primary navigation, shared by the desktop Sidebar, the mobile
 * bottom tab bar, the drawer, and the mobile top bar's title.
 */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'בית', icon: Home, exact: true },
  { to: '/dashboard/calendar', label: 'תורים', icon: CalendarDays, exact: false },
  { to: '/dashboard/leads', label: 'לידים', icon: SquareKanban, exact: false },
  { to: '/dashboard/customers', label: 'לקוחות', icon: Users, exact: false },
  { to: '/dashboard/conversations', label: 'שיחות', icon: MessageSquare, exact: false },
] as const

export const SETTINGS_SUB_ITEMS = [
  { id: 'general', label: 'כללי', route: '/dashboard/settings/general' },
  { id: 'policy', label: 'מדיניות הסטודיו', route: '/dashboard/settings/policy' },
  { id: 'team', label: 'צוות והרשאות', route: '/dashboard/settings/team' },
  { id: 'ai', label: 'סוכן AI', route: '/dashboard/settings/ai' },
  { id: 'faq', label: 'שאלות נפוצות', route: '/dashboard/settings/faq' },
  { id: 'backups', label: 'גיבויים', route: '/dashboard/settings/backups' },
] as const

/**
 * Longest-prefix match for the mobile top bar title. Reversed so `/dashboard` (a prefix of
 * every other route) only wins when nothing more specific matches.
 */
export function routeTitle(pathname: string): string {
  if (pathname === '/dashboard/settings') return 'הגדרות'
  const settingsItem = SETTINGS_SUB_ITEMS.find((i) => i.route === pathname)
  if (settingsItem) return settingsItem.label
  if (pathname === '/dashboard/settings/whatsapp') return 'חיבור WhatsApp'
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
export function settingsBackTarget(pathname: string, search: Record<string, unknown>): SettingsBackTarget | null {
  if (pathname === '/dashboard/settings/team' && typeof search.staff === 'string' && search.staff) {
    return { to: '/dashboard/settings/team', search: {} }
  }
  if (pathname === '/dashboard/settings/whatsapp') return { to: '/dashboard/setup' }
  if (pathname !== '/dashboard/settings' && pathname.startsWith('/dashboard/settings')) {
    return { to: '/dashboard/settings' }
  }
  if (pathname === '/dashboard/setup') return { to: '/dashboard' }
  return null
}
