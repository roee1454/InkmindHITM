import { Suspense, lazy } from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import appCss from '../styles.css?url'

import { ToastProvider } from '../components/ui/ToastProvider'

import type { QueryClient } from '@tanstack/react-query'

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
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Inkmind CRM',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <Suspense fallback={null}>
          <DevtoolsSetup />
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}
