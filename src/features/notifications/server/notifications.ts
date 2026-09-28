import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

import { toNotificationKind } from '../utils/notification-helpers'
import type { ApiNotification, NotificationKind, NotificationType } from '../types'

export type { ApiNotification, NotificationType }

const kindSchema = z.object({ kind: z.enum(['system', 'whatsapp_message']).optional() }).optional()

/** A filter matching one kind; rows from before the field existed count as system. */
function kindFilter(kind: NotificationKind | undefined): string {
  if (!kind) return ''
  return kind === 'system' ? "kind != 'whatsapp_message'" : "kind = 'whatsapp_message'"
}

async function requireSession() {
  const { getSession } = await import('@/lib/session.server')
  const session = await getSession()
  if (!session) throw new Error('לא מחובר.')
  return session
}

export const getNotifications = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiNotification[]> => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    const list = await su.collection('notifications').getFullList({ sort: '-created' })
    return list.map((item) => ({
      id: item.id,
      title: (item.title as string) || '',
      message: (item.message as string) || '',
      type: (item.type || 'info') as ApiNotification['type'],
      kind: toNotificationKind(item.kind),
      read: Boolean(item.read),
      link: (item.link as string) || undefined,
      created: item.created,
    }))
  },
)

export const getUnreadNotificationsCount = createServerFn({ method: 'GET' }).handler(
  async (): Promise<number> => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    const list = await su.collection('notifications').getList(1, 1, {
      filter: 'read != true',
    })
    return list.totalItems
  },
)

export const markNotificationAsRead = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    await su.collection('notifications').update(data.id, { read: true })
    return { ok: true }
  })

export const markAllNotificationsAsRead = createServerFn({ method: 'POST' })
  .validator(kindSchema)
  .handler(async ({ data }) => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    const unread = await su.collection('notifications').getFullList({
      filter: ['read != true', kindFilter(data?.kind)].filter(Boolean).join(' && '),
      fields: 'id',
    })
    await Promise.all(
      unread.map((item) => su.collection('notifications').update(item.id, { read: true })),
    )
    return { ok: true }
  })

export const deleteNotification = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    await su.collection('notifications').delete(data.id)
    return { ok: true }
  })

export const clearAllNotifications = createServerFn({ method: 'POST' })
  .validator(kindSchema)
  .handler(async ({ data }) => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    const all = await su.collection('notifications').getFullList({ filter: kindFilter(data?.kind), fields: 'id' })
    await Promise.all(all.map((item) => su.collection('notifications').delete(item.id)))
    return { ok: true }
  })

/** Removes several at once — the WhatsApp tab deletes a whole conversation's messages. */
export const deleteNotifications = createServerFn({ method: 'POST' })
  .validator(z.object({ ids: z.array(z.string()).max(500) }))
  .handler(async ({ data }) => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    await Promise.all(data.ids.map((id) => su.collection('notifications').delete(id).catch(() => null)))
    return { ok: true }
  })

/** Marks several read at once — opening a conversation from the WhatsApp tab. */
export const markNotificationsAsRead = createServerFn({ method: 'POST' })
  .validator(z.object({ ids: z.array(z.string()).max(500) }))
  .handler(async ({ data }) => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    await Promise.all(data.ids.map((id) => su.collection('notifications').update(id, { read: true }).catch(() => null)))
    return { ok: true }
  })

/** Helper to add a system notification from the server side. Only ever called from other
 *  server modules (appointments/state-machine/AI agent) — `createServerOnlyFn` guarantees it
 *  can't be pulled into the client bundle even via a dynamic import. */
export const addSystemNotification = createServerOnlyFn(
  async (data: { title: string; message: string; type: ApiNotification['type']; link?: string }) => {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return null
    }
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    return su.collection('notifications').create({
      title: data.title,
      message: data.message,
      type: data.type,
      kind: 'system',
      read: false,
      link: data.link,
    })
  },
)

/** A customer's WhatsApp message, for the notifications screen's WhatsApp tab (one row per conversation). */
export const addWhatsAppMessageNotification = createServerOnlyFn(
  async (data: { sender: string; preview: string; conversationId: string }) => {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return null
    }
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    return su.collection('notifications').create({
      title: data.sender,
      message: data.preview,
      type: 'info',
      kind: 'whatsapp_message',
      read: false,
      link: conversationLink(data.conversationId),
    })
  },
)

export function conversationLink(conversationId: string): string {
  return `/dashboard/conversations?chatId=${conversationId}`
}
