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
  { id: 'team', label: 'צוות והרשאות' },
  { id: 'ai', label: 'הגדרות סוכן AI' },
  { id: 'policy', label: 'מדיניות סטודיו' },
  { id: 'whatsapp', label: 'וואטסאפ' },
  { id: 'backups', label: 'גיבויים' },
] as const

/**
 * Longest-prefix match for the mobile top bar title. Reversed so `/dashboard` (a prefix of
 * every other route) only wins when nothing more specific matches.
 */
export function routeTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard/settings')) return 'הגדרות'
  if (pathname.startsWith('/dashboard/notifications')) return 'התראות'
  return [...NAV_ITEMS].reverse().find((i) => pathname.startsWith(i.to))?.label ?? 'Inkmind'
}
