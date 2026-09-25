import { describe, expect, it } from 'vitest'
import { saveOnboardingPaymentsSchema } from '@/features/onboarding/server/onboarding'
import { settingsBackTarget } from '@/components/navigation'
import { useInviteUiStore } from '@/features/invite/store/inviteUiStore'

describe('Onboarding & Settings Validation & Navigation Tests', () => {
  describe('saveOnboardingPaymentsSchema', () => {
    it('accepts depositRequired=false with any deposit amount or null', () => {
      const res = saveOnboardingPaymentsSchema.safeParse({
        depositRequired: false,
        depositAmount: 0,
        paymentInstructions: '',
      })
      expect(res.success).toBe(true)
    })

    it('accepts depositRequired=true with positive deposit amount', () => {
      const res = saveOnboardingPaymentsSchema.safeParse({
        depositRequired: true,
        depositAmount: 200,
        paymentInstructions: 'Bit to 050-1234567',
      })
      expect(res.success).toBe(true)
    })

    it('rejects depositRequired=true with depositAmount=0 or negative', () => {
      const resZero = saveOnboardingPaymentsSchema.safeParse({
        depositRequired: true,
        depositAmount: 0,
        paymentInstructions: '',
      })
      expect(resZero.success).toBe(false)

      const resNull = saveOnboardingPaymentsSchema.safeParse({
        depositRequired: true,
        depositAmount: null,
        paymentInstructions: '',
      })
      expect(resNull.success).toBe(false)
    })
  })

  describe('settingsBackTarget for non-admin staff', () => {
    it('returns /dashboard for non-admin in any settings route', () => {
      const target = settingsBackTarget('/dashboard/settings/team', {}, false)
      expect(target).toEqual({ to: '/dashboard' })

      const targetRoot = settingsBackTarget('/dashboard/settings', {}, false)
      expect(targetRoot).toEqual({ to: '/dashboard' })
    })

    it('returns /dashboard/settings for admin navigating within sub-settings', () => {
      const target = settingsBackTarget('/dashboard/settings/general', {}, true)
      expect(target).toEqual({ to: '/dashboard/settings' })
    })

    it('returns null on bare settings for admin (shows hamburger menu)', () => {
      const target = settingsBackTarget('/dashboard/settings', {}, true)
      expect(target).toBeNull()
    })
  })

  describe('invite store profile error and state', () => {
    it('updates profileError and clears it properly', () => {
      const store = useInviteUiStore.getState()
      expect(store.profileError).toBeNull()

      store.setProfileError('קישור לאינסטגרם או תיק עבודות הוא שדה חובה')
      expect(useInviteUiStore.getState().profileError).toBe('קישור לאינסטגרם או תיק עבודות הוא שדה חובה')

      store.setProfileError(null)
      expect(useInviteUiStore.getState().profileError).toBeNull()
    })
  })
})

