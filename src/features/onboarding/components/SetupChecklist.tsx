import type { ComponentType } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare, CalendarDays, Wallet, Users, CalendarOff, Link2, HelpCircle, ChevronLeft } from 'lucide-react'
import { getSettings, getSetupChecklistState } from '../server/onboarding'
import { getStaffList } from '@/features/settings/server/staff'
import { getStudioClosures } from '@/features/settings/server/closures'
import { getFaqList } from '@/features/settings/server/faq'
import { getArtistProfiles } from '@/features/settings/server/profiles'
import { getWhatsAppSettingsForm } from '@/features/settings/server/whatsapp'
import { getGoogleCalendarConnections } from '@/features/calendar/server/appointments'

export interface ChecklistItem {
  id: string
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  why: string
  done: boolean
  link: string
}

/** Live-derived checklist — each item's `done` state comes from real data, not a persisted
 *  flag, so it never drifts from reality (connect Google Calendar in Settings and the item
 *  flips done here immediately, no separate "mark as done" step). */
export function useSetupChecklist() {
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: () => getSettings() })
  const staffQuery = useQuery({ queryKey: ['staff-list'], queryFn: () => getStaffList() })
  const closuresQuery = useQuery({ queryKey: ['studio-closures'], queryFn: () => getStudioClosures() })
  const faqQuery = useQuery({ queryKey: ['faq-list'], queryFn: () => getFaqList() })
  const profilesQuery = useQuery({ queryKey: ['artist-profiles'], queryFn: () => getArtistProfiles() })
  const whatsappQuery = useQuery({ queryKey: ['whatsapp-settings-form'], queryFn: () => getWhatsAppSettingsForm() })
  const googleQuery = useQuery({ queryKey: ['google-calendar-connections'], queryFn: () => getGoogleCalendarConnections() })
  const checklistStateQuery = useQuery({ queryKey: ['setup-checklist-state'], queryFn: () => getSetupChecklistState() })

  const isLoading =
    settingsQuery.isLoading || staffQuery.isLoading || closuresQuery.isLoading || faqQuery.isLoading || profilesQuery.isLoading

  const items: ChecklistItem[] = [
    {
      id: 'whatsapp',
      icon: MessageSquare,
      label: 'חיבור WhatsApp',
      why: 'נבדק אוטומטית מול ה-Cloud API',
      done: Boolean(whatsappQuery.data?.hasAccessToken && whatsappQuery.data?.hasPhoneNumberId),
      link: '/dashboard/settings/whatsapp',
    },
    {
      id: 'google_calendar',
      icon: CalendarDays,
      label: 'יומן Google',
      why: 'סנכרון תורים אוטומטי ליומן שלך',
      done: Boolean(googleQuery.data?.some((c) => c.status === 'connected')),
      link: '/dashboard/settings/team',
    },
    {
      id: 'deposit_method',
      icon: Wallet,
      label: 'אמצעי תשלום למקדמה',
      why: 'כדי שהסוכן ידע להנחות לקוחות בתשלום',
      done: Boolean(settingsQuery.data?.payment_instructions),
      link: '/dashboard/settings/policy',
    },
    {
      id: 'team',
      icon: Users,
      label: 'חברי צוות',
      why: 'הוספת עוד מקעקעים לסטודיו',
      done: (staffQuery.data?.length ?? 0) > 1,
      link: '/dashboard/settings/team',
    },
    {
      id: 'closures',
      icon: CalendarOff,
      why: 'ימי חג וסגירה שהסוכן לא יציע',
      label: 'ימי סגירה',
      done: (closuresQuery.data?.length ?? 0) > 0,
      link: '/dashboard/settings/policy',
    },
    {
      id: 'links_bio',
      icon: Link2,
      label: 'קישורים וביוגרפיה',
      why: 'כדי שהסוכן יפנה לקוחות לתיק העבודות שלך',
      done: Boolean(profilesQuery.data?.some((p) => p.bio || p.instagramHandle || p.portfolioUrl)),
      link: '/dashboard/settings/team',
    },
    {
      id: 'faq',
      icon: HelpCircle,
      label: 'שאלות נפוצות',
      why: 'הסוכן עונה מהן ישירות ללקוחות',
      done: (faqQuery.data?.length ?? 0) > 0,
      link: '/dashboard/settings/faq',
    },
  ]

  return { items, isLoading, cardDismissed: Boolean(checklistStateQuery.data?.cardDismissed) }
}

export function SetupChecklist({ maxRows, showFooterLink = false }: { maxRows?: number; showFooterLink?: boolean }) {
  const navigate = useNavigate()
  const { items, isLoading } = useSetupChecklist()
  const doneCount = items.filter((i) => i.done).length
  // Collapsed (dashboard) view only needs your attention on what's left; the footer link's own
  // "display all" destination (/dashboard/setup) still shows everything, done included.
  const undoneItems = items.filter((i) => !i.done)
  const visibleItems = maxRows ? undoneItems.slice(0, maxRows) : items

  if (isLoading) return null

  return (
    <div className="card-native overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h3 className="text-[16.5px] font-extrabold text-foreground">להשלים את ההגדרה</h3>
        <span className="text-[13px] font-bold text-muted-foreground">
          {doneCount} / {items.length}
        </span>
      </div>
      <div className="px-5 pb-3">
        <div className="h-[7px] w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-native"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
      </div>
      {visibleItems.map((item) => (
        <div key={item.id} onClick={() => navigate({ to: item.link })} className="row-native cursor-pointer">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${item.done ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground'}`}>
            <item.icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-foreground">{item.label}</div>
            <div className="truncate text-[13px] text-muted-foreground">{item.why}</div>
          </div>
          {item.done ? (
            <span className="pill bg-success/12 text-success shrink-0">בוצע</span>
          ) : (
            <ChevronLeft size={18} className="shrink-0 text-muted-foreground" />
          )}
        </div>
      ))}
      {showFooterLink && maxRows && undoneItems.length > maxRows && (
        <button
          type="button"
          onClick={() => navigate({ to: '/dashboard/setup' })}
          className="w-full cursor-pointer border-t border-border/60 py-3 text-center text-[13.5px] font-bold text-primary"
        >
          הצג הכל
        </button>
      )}
    </div>
  )
}
