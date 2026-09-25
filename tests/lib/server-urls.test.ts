import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getAppBaseUrl, resolveAppUrl } from '@/lib/server-urls.server'

describe('server-urls.server unit tests', () => {
  const originalAppUrl = process.env.APP_URL
  const originalViteAppUrl = process.env.VITE_APP_URL

  beforeEach(() => {
    delete process.env.APP_URL
    delete process.env.VITE_APP_URL
  })

  afterEach(() => {
    if (originalAppUrl !== undefined) {
      process.env.APP_URL = originalAppUrl
    } else {
      delete process.env.APP_URL
    }
    if (originalViteAppUrl !== undefined) {
      process.env.VITE_APP_URL = originalViteAppUrl
    } else {
      delete process.env.VITE_APP_URL
    }
  })

  it('uses process.env.APP_URL when set and strips trailing slash', () => {
    process.env.APP_URL = 'https://app.inkmind.io/'
    expect(getAppBaseUrl()).toBe('https://app.inkmind.io')
    expect(resolveAppUrl('/invite?token=xyz')).toBe('https://app.inkmind.io/invite?token=xyz')
  })

  it('uses process.env.VITE_APP_URL if APP_URL is unset', () => {
    process.env.VITE_APP_URL = 'https://preview.inkmind.io'
    expect(getAppBaseUrl()).toBe('https://preview.inkmind.io')
    expect(resolveAppUrl('invite?token=xyz')).toBe('https://preview.inkmind.io/invite?token=xyz')
  })

  it('falls back to http://localhost:3101 when no env vars are set and outside request context', () => {
    expect(getAppBaseUrl()).toBe('http://localhost:3101')
    expect(resolveAppUrl('/invite?token=test1234')).toBe('http://localhost:3101/invite?token=test1234')
  })

  it('handles paths with and without leading slash cleanly', () => {
    process.env.APP_URL = 'http://localhost:3101'
    expect(resolveAppUrl('/auth/login')).toBe('http://localhost:3101/auth/login')
    expect(resolveAppUrl('auth/login')).toBe('http://localhost:3101/auth/login')
  })
})

