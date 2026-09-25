/**
 * PWA and Web Notifications dispatcher utility.
 * Supports both Desktop and Mobile browsers (including iOS 16.4+ installed PWAs).
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch {
    return Notification.permission
  }
}

export interface PwaNotificationOptions {
  body?: string
  link?: string
  tag?: string
}

export async function sendPwaNotification(
  title: string,
  options: PwaNotificationOptions = {},
): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (Notification.permission !== 'granted') return false

  const notificationOptions: NotificationOptions = {
    body: options.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    tag: options.tag || `inkmind-${Date.now()}`,
    data: {
      url: options.link || '/dashboard/notifications',
    },
  }

  // 1. Prefer Service Worker registration (required on mobile PWA & background tabs)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(title, notificationOptions)
        return true
      }
    } catch {
      // Fallback below
    }
  }

  // 2. Fallback to native Window Notification API
  try {
    const notification = new Notification(title, notificationOptions)
    notification.onclick = () => {
      window.focus()
      if (options.link) {
        window.location.href = options.link
      }
      notification.close()
    }
    return true
  } catch {
    return false
  }
}
