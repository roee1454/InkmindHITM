import React, { Suspense, lazy } from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import appCss from '../styles.css?url'

import { ToastProvider } from '../components/ui/ToastProvider'
import { ServiceWorkerRegistrar } from '../components/ServiceWorkerRegistrar'

import type { QueryClient } from '@tanstack/react-query'

// Runs before first paint (blocking inline script, not a React effect) so a returning visitor
// never sees the hardcoded indigo/light default flash before the real theme applies. Written to
// by `dashboard/route.tsx` on every load, from the already-fetched `settings` record — this
// script itself makes no network request, it only reads the local cache.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('ui-theme');var d=localStorage.getItem('ui-dark-mode');if(t)document.documentElement.setAttribute('data-theme',t);if(d==='1')document.documentElement.classList.add('dark');}catch(e){}})();`

interface MyRouterContext {
  queryClient: QueryClient
}

const DevtoolsSetup =
  process.env.NODE_ENV === 'production'
    ? () => null
    : lazy(() => import('../components/DevtoolsSetup'))

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content',
      },
      { title: 'Inkmind CRM' },
      {
        name: 'description',
        content: 'מערכת ניהול סטודיו קעקועים — תורים, לידים, לקוחות ושיחות',
      },
      { name: 'theme-color', content: '#ffffff' },
      { name: 'color-scheme', content: 'light' },
      { name: 'application-name', content: 'Inkmind' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Inkmind' },
      // `default` keeps content below the iOS status bar. `black-translucent` would require
      // padding MobileTopBar by env(safe-area-inset-top) or the title renders under the clock.
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/favicon-16.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const preventZoom = (e: Event) => {
      e.preventDefault()
    }
    document.addEventListener('gesturestart', preventZoom)
    return () => {
      document.removeEventListener('gesturestart', preventZoom)
    }
  }, [])

  return (
    // The inline THEME_INIT_SCRIPT below rewrites data-theme (and toggles .dark) from
    // localStorage before hydration, on purpose, so returning visitors don't flash the
    // hardcoded default — React must be told not to reconcile that intentional mismatch.
    <html lang="he" dir="rtl" data-theme="indigo" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <ServiceWorkerRegistrar />
        <Suspense fallback={null}>
          <DevtoolsSetup />
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}
