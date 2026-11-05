import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import webpush from 'web-push'
import { z } from 'zod'

export interface WebPushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  badge?: string
  icon?: string
}

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
})

let vapidConfigured = false

export function configureVapid(): boolean {
  if (vapidConfigured) return true

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@inkmind.io'

  if (!publicKey || !privateKey) {
    return false
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
    return true
  } catch (err) {
    console.error('[web-push] Failed to configure VAPID details:', err)
    return false
  }
}

async function requireSession() {
  const { getSession } = await import('@/lib/session.server')
  const session = await getSession()
  if (!session) throw new Error('לא מחובר.')
  return session
}

/**
 * Returns the VAPID public key so client browsers can call PushManager.subscribe().
 */
export const getVapidPublicKey = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
  }
})

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

export async function savePushSubscription(
  staffId: string,
  data: PushSubscriptionData,
  su: {
    collection: (name: string) => any
    filter: (str: string, params: Record<string, unknown>) => string
  },
): Promise<{ ok: boolean; id: string }> {
  const existing = await su
    .collection('push_subscriptions')
    .getFirstListItem(su.filter('endpoint = {:endpoint}', { endpoint: data.endpoint }))
    .catch(() => null)

  if (existing) {
    await su.collection('push_subscriptions').update(existing.id, {
      staff: staffId,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      user_agent: data.userAgent || '',
    })
    return { ok: true, id: existing.id }
  }

  const created = await su.collection('push_subscriptions').create({
    staff: staffId,
    endpoint: data.endpoint,
    p256dh: data.keys.p256dh,
    auth: data.keys.auth,
    user_agent: data.userAgent || '',
  })

  return { ok: true, id: created.id }
}

export async function deletePushSubscription(
  endpoint: string,
  su: {
    collection: (name: string) => any
    filter: (str: string, params: Record<string, unknown>) => string
  },
): Promise<{ ok: boolean }> {
  try {
    const existing = await su
      .collection('push_subscriptions')
      .getFirstListItem(su.filter('endpoint = {:endpoint}', { endpoint }))
      .catch(() => null)

    if (existing) {
      await su.collection('push_subscriptions').delete(existing.id)
    }
    return { ok: true }
  } catch {
    return { ok: true }
  }
}

/**
 * Registers a device push subscription for the logged-in staff member.
 */
export const registerPushSubscription = createServerFn({ method: 'POST' })
  .validator(subscriptionSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()

    try {
      return await savePushSubscription(session.staff.id, data, su)
    } catch (err) {
      console.error('[web-push] Failed to save push subscription:', err)
      throw new Error('שמירת התראות Push נכשלה.')
    }
  })

/**
 * Unregisters a device push subscription.
 */
export const unregisterPushSubscription = createServerFn({ method: 'POST' })
  .validator(z.object({ endpoint: z.string().url() }))
  .handler(async ({ data }) => {
    await requireSession()
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()
    return await deletePushSubscription(data.endpoint, su)
  })

/**
 * Server-only function to deliver a push notification to one or all staff members.
 * Cleans up expired / uninstalled subscriptions (HTTP 410 or 404) automatically.
 */
export const broadcastWebPushToStaff = createServerOnlyFn(
  async (payload: WebPushPayload, targetStaffId?: string): Promise<{ sent: number; failed: number }> => {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return { sent: 0, failed: 0 }
    }

    if (!configureVapid()) {
      return { sent: 0, failed: 0 }
    }

    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const su = await getSuperuserClient()

    try {
      const filter = targetStaffId ? su.filter('staff = {:staffId}', { staffId: targetStaffId }) : ''
      const subscriptions = await su.collection('push_subscriptions').getFullList({ filter })

      if (subscriptions.length === 0) {
        return { sent: 0, failed: 0 }
      }

      const stringifiedPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/dashboard/notifications',
        tag: payload.tag || `inkmind-${Date.now()}`,
        icon: payload.icon || '/icons/icon-192.png',
        badge: payload.badge || '/icons/icon-192.png',
      })

      const pushOptions: webpush.RequestOptions = {
        TTL: 60 * 60 * 24, // 24 hours delivery window
        urgency: 'high',
      }

      let sent = 0
      let failed = 0

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const pushSubscription: webpush.PushSubscription = {
            endpoint: sub.endpoint as string,
            keys: {
              p256dh: sub.p256dh as string,
              auth: sub.auth as string,
            },
          }

          try {
            await webpush.sendNotification(pushSubscription, stringifiedPayload, pushOptions)
            sent++
          } catch (err: unknown) {
            failed++
            const statusCode = (err as { statusCode?: number })?.statusCode
            // 410 Gone or 404 Not Found indicates subscription expired or revoked
            if (statusCode === 410 || statusCode === 404) {
              console.log(`[web-push] Pruning expired subscription: ${sub.id}`)
              await su.collection('push_subscriptions').delete(sub.id).catch(() => null)
            } else {
              console.warn(`[web-push] Delivery failed for ${sub.id}:`, err)
            }
          }
        }),
      )

      return { sent, failed }
    } catch (err) {
      console.error('[web-push] broadcastWebPushToStaff error:', err)
      return { sent: 0, failed: 0 }
    }
  },
)

/**
 * Sends a test push notification to the logged-in staff member's registered devices.
 */
export const sendTestPushNotification = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await requireSession()
  const result = await broadcastWebPushToStaff(
    {
      title: 'התראת בדיקה מ-Inkmind CRM 🎯',
      body: 'התראות Push פעילות במכשיר זה! תקבל עדכונים גם כשהמסך נעול.',
      url: '/dashboard/notifications',
      tag: 'test-push',
    },
    session.staff.id,
  )

  return { ok: true, sent: result.sent }
})
