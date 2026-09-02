import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

export interface ApiNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  read: boolean
  link?: string
  created: string
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

export const markAllNotificationsAsRead = createServerFn({ method: 'POST' }).handler(
  async () => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    const unread = await su.collection('notifications').getFullList({
      filter: 'read != true',
      fields: 'id',
    })
    await Promise.all(
      unread.map((item) => su.collection('notifications').update(item.id, { read: true })),
    )
    return { ok: true }
  },
)

export const deleteNotification = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    await su.collection('notifications').delete(data.id)
    return { ok: true }
  })

export const clearAllNotifications = createServerFn({ method: 'POST' }).handler(
  async () => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    const all = await su.collection('notifications').getFullList({ fields: 'id' })
    await Promise.all(all.map((item) => su.collection('notifications').delete(item.id)))
    return { ok: true }
  },
)

/** Helper to add a system notification from the server side. Only ever called from other
 *  server modules (appointments/state-machine/AI agent) — `createServerOnlyFn` guarantees it
 *  can't be pulled into the client bundle even via a dynamic import. */
export const addSystemNotification = createServerOnlyFn(
  async (data: { title: string; message: string; type: ApiNotification['type']; link?: string }) => {
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    return su.collection('notifications').create({
      title: data.title,
      message: data.message,
      type: data.type,
      read: false,
      link: data.link,
    })
  },
)
