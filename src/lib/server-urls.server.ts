import { getRequestHeader } from '@tanstack/react-start/server'

/**
 * Resolves the full, public base URL for the application based on the current environment.
 * Priority order:
 * 1. process.env.APP_URL or process.env.VITE_APP_URL (configured in .env or Render service environment)
 * 2. Incoming request headers (x-forwarded-host / host, x-forwarded-proto) from TanStack Start server context
 * 3. Fallback: http://localhost:3101
 */
export function getAppBaseUrl(): string {
  const envUrl = process.env.APP_URL || process.env.VITE_APP_URL
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '')
  }

  try {
    const forwardedHost = getRequestHeader('x-forwarded-host')
    const host = (forwardedHost || getRequestHeader('host') || '').trim()
    if (host) {
      const forwardedProto = getRequestHeader('x-forwarded-proto')
      const proto =
        forwardedProto ||
        (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
      return `${proto}://${host}`
    }
  } catch {
    // getRequestHeader might throw when called outside an active request context (e.g. background runner)
  }

  return 'http://localhost:3101'
}

/**
 * Resolves a given path into a complete, absolute application URL.
 * e.g. resolveAppUrl('/invite?token=abc') -> 'http://localhost:3101/invite?token=abc'
 */
export function resolveAppUrl(path: string): string {
  const base = getAppBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

