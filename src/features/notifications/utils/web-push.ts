import {
  getVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription,
} from '../server/web-push'

/**
 * Converts a base64 URL-encoded string to a Uint8Array for PushManager applicationServerKey.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const atobFn =
    typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob.bind(window)
      : (b: string) => Buffer.from(b, 'base64').toString('binary')

  const rawData = atobFn(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Detects if the current user agent is iOS (iPhone/iPad/iPod).
 */
export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua)
}

/**
 * Detects if the web app is running as an installed standalone PWA on iOS/Desktop.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return isStandaloneMatch || isIosStandalone
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * Subscribes the current device to Web Push notifications.
 */
export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isWebPushSupported()) {
    return { success: false, error: 'דפדפן זה אינו תומך בהתראות Push.' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { success: false, error: 'ההרשאה להתראות נדחתה על ידי המשתמש.' }
    }

    const { publicKey } = await getVapidPublicKey()
    if (!publicKey) {
      return { success: false, error: 'מפתח VAPID אינו מוגדר בשרת.' }
    }

    const reg = await navigator.serviceWorker.ready
    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      })
    }

    const subJson = subscription.toJSON()
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: 'מבנה נתוני המנוי אינו תקין.' }
    }

    await registerPushSubscription({
      data: {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
    })

    return { success: true }
  } catch (err: unknown) {
    console.error('[web-push] Subscription failed:', err)
    const message = err instanceof Error ? err.message : 'שגיאה בלתי צפויה ברישום להתראות.'
    return { success: false, error: message }
  }
}

/**
 * Unsubscribes the current device from Web Push notifications.
 */
export async function unsubscribeFromPush(): Promise<{ success: boolean }> {
  if (!isWebPushSupported()) return { success: true }

  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()

    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      await unregisterPushSubscription({ data: { endpoint } }).catch(() => null)
    }

    return { success: true }
  } catch (err) {
    console.error('[web-push] Unsubscription error:', err)
    return { success: false }
  }
}
