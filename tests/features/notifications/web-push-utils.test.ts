// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  urlBase64ToUint8Array,
  isIosDevice,
  isStandalonePwa,
} from '@/features/notifications/utils/web-push'

describe('Web Push Client Utilities', () => {
  describe('urlBase64ToUint8Array', () => {
    it('correctly converts a base64url string to Uint8Array', () => {
      // Test key in base64url
      const base64Url = 'BAuiYqFr_Ly1fOMyQ2nUyv6ell9yamMQy3wD-7fZwQvqamp1Q3DYudnoZa3lG7D5PId4GW6h3ppJuVwIq6B203A'
      const uint8 = urlBase64ToUint8Array(base64Url)

      expect(uint8).toBeInstanceOf(Uint8Array)
      expect(uint8.length).toBeGreaterThan(0)
    })
  })

  describe('isIosDevice', () => {
    it('returns true when userAgent contains iPhone or iPad', () => {
      const originalUserAgent = window.navigator.userAgent

      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      })
      expect(isIosDevice()).toBe(true)

      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      })
      expect(isIosDevice()).toBe(true)

      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      })
      expect(isIosDevice()).toBe(false)

      Object.defineProperty(window.navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      })
    })
  })

  describe('isStandalonePwa', () => {
    it('returns true when matchMedia display-mode is standalone', () => {
      const originalMatchMedia = window.matchMedia

      window.matchMedia = (query: string) => ({
        matches: query.includes('display-mode: standalone'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })

      expect(isStandalonePwa()).toBe(true)

      window.matchMedia = originalMatchMedia
    })
  })
})
