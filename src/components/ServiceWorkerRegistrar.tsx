import { useEffect } from 'react'

/**
 * Registers the service worker. Renders nothing, so it contributes no SSR markup and cannot
 * cause a hydration mismatch — and registration happens in an effect because `navigator` does
 * not exist on the server.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // A service worker and Vite's HMR fight each other. This also actively cleans up a worker
    // left behind by a previous *production* visit to the same origin — without it, a stale
    // SW on localhost:3101 would keep serving cached assets over the dev server.
    if (import.meta.env.DEV) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => void r.unregister()))
      return
    }

    const register = () => {
      // `updateViaCache: 'none'` forces the browser to revalidate sw.js itself on every update
      // check, so a new deploy can't be blocked by an HTTP-cached worker.
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {})
    }

    if (document.readyState === 'complete') {
      register()
      return
    }
    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
