/* Inkmind CRM service worker.
 *
 * Deliberately minimal. This is a booking CRM: serving a stale appointment, lead or message
 * would be worse than showing an error, so nothing dynamic is ever cached — only the offline
 * fallback, the content-hashed build output, and static brand assets.
 *
 * Not processed by Vite (it lives in public/ and is copied verbatim), so: plain JS only, no
 * imports, no import.meta.env. Bump VERSION on every change to this file.
 */
const VERSION = 'v2'
const CACHE = `inkmind-${VERSION}`
const OFFLINE_URL = '/offline.html'

const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Cross-origin is off limits: PocketBase (realtime SSE + media), Google Fonts, Meta.
  if (url.origin !== self.location.origin) return
  // Server functions and API routes are always live — never cached, never replayed.
  if (url.pathname.startsWith('/_serverFn/')) return
  if (url.pathname.startsWith('/api/')) return

  // Navigations: network-first, falling back to the offline page rather than a stale screen.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.open(CACHE).then((c) => c.match(OFFLINE_URL))),
    )
    return
  }

  // Content-hashed build output — cache-first is safe by construction.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      }),
    )
    return
  }

  // Static brand files: stale-while-revalidate.
  if (/\.(png|ico|svg|webmanifest|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req)
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone())
            return res
          })
          .catch(() => hit)
        return hit || fresh
      }),
    )
    return
  }

  // Everything else falls through to the network untouched.
})

// Handle notification click on PC / Mobile device
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/dashboard/notifications'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a CRM window is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    }),
  )
})
