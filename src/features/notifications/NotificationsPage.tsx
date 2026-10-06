import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationsHeader } from './components/NotificationsHeader'
import { PwaPermissionBanner } from './components/PwaPermissionBanner'
import { SystemNotificationList } from './components/SystemNotificationList'
import { WhatsAppThreadList } from './components/WhatsAppThreadList'
import { useNotifications } from './hooks/useNotifications'
import { usePwaNotifications } from './hooks/usePwaNotifications'
import type { ApiNotification } from './types'

export type NotificationsTab = 'system' | 'whatsapp'

export interface NotificationsPageProps {
  highlightId?: string
  tab?: NotificationsTab
  onTabChange: (tab: NotificationsTab) => void
}

function TabCount({ unread }: { unread: number }) {
  if (unread === 0) return null
  return <span className="rounded-full bg-foreground px-1.5 text-2xs font-extrabold text-background tabular-nums">{unread}</span>
}

/**
 * Two questions, two tabs: what did the system tell us, and who wrote in on WhatsApp. They used to
 * share one list, where a busy afternoon of customer messages buried the escalation that needed
 * someone now.
 */
export function NotificationsPage({ highlightId, tab, onTabChange }: NotificationsPageProps) {
  const navigate = useNavigate()
  const { notifications, isLoading, system, whatsapp, markRead, remove, markAllRead, clearAll, isMarkingAllRead, isClearingAll } = useNotifications()
  const { permission, enableNotifications } = usePwaNotifications()
  const highlightRef = useRef<HTMLDivElement>(null)

  const highlighted = highlightId ? notifications.find((n) => n.id === highlightId) : undefined
  // A link to one notification opens its tab; otherwise the tab with something unread, system first.
  const active: NotificationsTab = tab ?? (highlighted?.kind === 'whatsapp_message' ? 'whatsapp' : system.unread === 0 && whatsapp.unread > 0 ? 'whatsapp' : 'system')

  useEffect(() => {
    if (!highlighted) return
    if (!highlighted.read) markRead([highlighted.id])
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlighted?.id])

  const openNotification = (n: ApiNotification) => {
    if (!n.read) markRead([n.id])
    if (n.link) void navigate({ href: n.link })
  }

  const counts = active === 'system' ? system : whatsapp

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 font-assistant lg:gap-6" dir="rtl">
      <NotificationsHeader
        unread={counts.unread}
        total={counts.total}
        isMarkingAllRead={isMarkingAllRead}
        isClearingAll={isClearingAll}
        onMarkAllRead={() => markAllRead(active === 'system' ? 'system' : 'whatsapp_message')}
        onClearAll={() => void clearAll(active === 'system' ? 'system' : 'whatsapp_message')}
      />

      <PwaPermissionBanner permission={permission} onEnable={() => void enableNotifications()} />

      <Tabs value={active} onValueChange={(v) => onTabChange(v as NotificationsTab)} dir="rtl" className="gap-4">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="system" className="gap-2">
            מערכת
            <TabCount unread={system.unread} />
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            וואטסאפ
            <TabCount unread={whatsapp.unread} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <SystemNotificationList
            groups={system.groups}
            isLoading={isLoading}
            highlightId={highlightId}
            highlightRef={highlightRef}
            onOpen={openNotification}
            onDelete={(id) => remove([id])}
          />
        </TabsContent>
        <TabsContent value="whatsapp">
          <WhatsAppThreadList
            threads={whatsapp.threads}
            isLoading={isLoading}
            onOpen={(thread) => {
              markRead(thread.unreadIds)
              if (thread.link) void navigate({ href: thread.link })
            }}
            onDelete={(thread) => remove(thread.ids)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default NotificationsPage
