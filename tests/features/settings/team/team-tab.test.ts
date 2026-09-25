import { describe, expect, it } from 'vitest'
import {
  addStaffSchema,
  acceptStaffInviteSchema,
} from '@/features/settings/server/staff'
import { resolveAppUrl } from '@/lib/server-urls.server'
import { summarizeWorkingHours } from '@/features/settings/tabs/team/utils/summarizeWorkingHours'
import type { WorkingHoursWindow } from '@/features/settings/server/settings'

describe('Team Tab Unit Tests', () => {
  describe('summarizeWorkingHours', () => {
    it('returns "לא הוגדרו שעות" when windows are empty or null', () => {
      expect(summarizeWorkingHours(null)).toBe('לא הוגדרו שעות')
      expect(summarizeWorkingHours(undefined)).toBe('לא הוגדרו שעות')
      expect(summarizeWorkingHours([])).toBe('לא הוגדרו שעות')
    })

    it('returns formatted range when all windows share the same hours', () => {
      const windows: WorkingHoursWindow[] = [
        { dayOfWeek: 0, startTime: '11:00', endTime: '19:00' },
        { dayOfWeek: 1, startTime: '11:00', endTime: '19:00' },
        { dayOfWeek: 2, startTime: '11:00', endTime: '19:00' },
        { dayOfWeek: 3, startTime: '11:00', endTime: '19:00' },
        { dayOfWeek: 4, startTime: '11:00', endTime: '19:00' },
      ]
      expect(summarizeWorkingHours(windows)).toBe('5 ימים · 11:00-19:00')
    })

    it('returns count when windows have differing hours', () => {
      const windows: WorkingHoursWindow[] = [
        { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 1, startTime: '11:00', endTime: '19:00' },
        { dayOfWeek: 2, startTime: '11:00', endTime: '19:00' },
      ]
      expect(summarizeWorkingHours(windows)).toBe('3 ימים מוגדרים')
    })
  })

  describe('addStaffSchema', () => {
    it('validates a correct payload with name, email and role', () => {
      const result = addStaffSchema.safeParse({
        name: 'דניאל רז',
        email: 'daniel@inkmind.io',
        role: 'staff',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('דניאל רז')
        expect(result.data.email).toBe('daniel@inkmind.io')
        expect(result.data.role).toBe('staff')
      }
    })

    it('defaults role to staff when not provided', () => {
      const result = addStaffSchema.safeParse({
        name: 'אלון כהן',
        email: 'alon@inkmind.io',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe('staff')
      }
    })

    it('rejects an invalid email address', () => {
      const result = addStaffSchema.safeParse({
        name: 'רועי לוי',
        email: 'not-an-email',
        role: 'admin',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('נא להזין אימייל תקין')
      }
    })

    it('rejects a name that is too short (< 2 characters)', () => {
      const result = addStaffSchema.safeParse({
        name: 'א',
        email: 'short@inkmind.io',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('השם חייב להכיל לפחות 2 תווים')
      }
    })

    it('rejects an unsupported role', () => {
      const result = addStaffSchema.safeParse({
        name: 'שיראל',
        email: 'shirel@inkmind.io',
        role: 'superadmin',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('acceptStaffInviteSchema', () => {
    it('validates a matching password (>= 8 chars) and valid phone', () => {
      const result = acceptStaffInviteSchema.safeParse({
        token: 'valid_crypto_token_123',
        password: 'securePassword123',
        passwordConfirm: 'securePassword123',
        phone: '0521234567',
      })
      expect(result.success).toBe(true)
    })

    it('rejects mismatched password and passwordConfirm', () => {
      const result = acceptStaffInviteSchema.safeParse({
        token: 'token_abc',
        password: 'securePassword123',
        passwordConfirm: 'differentPassword456',
        phone: '0521234567',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('הסיסמאות אינן תואמות')
      }
    })

    it('rejects passwords shorter than 8 characters', () => {
      const result = acceptStaffInviteSchema.safeParse({
        token: 'token_abc',
        password: '12345',
        passwordConfirm: '12345',
        phone: '0521234567',
      })
      expect(result.success).toBe(false)
    })

    it('rejects phone numbers shorter than 9 digits', () => {
      const result = acceptStaffInviteSchema.safeParse({
        token: 'token_abc',
        password: 'securePassword123',
        passwordConfirm: 'securePassword123',
        phone: '12345',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('נא להזין מספר טלפון תקין')
      }
    })
  })

  describe('Invite Pending Status Mapping', () => {
    it('correctly maps pending vs accepted invite status', () => {
      const pendingStaff = {
        id: 'staff_1',
        invite_token: 'active_token',
        invite_accepted_at: null,
      }
      const acceptedStaff = {
        id: 'staff_2',
        invite_token: '',
        invite_accepted_at: '2026-09-19T12:00:00Z',
      }

      const isPending1 = Boolean(pendingStaff.invite_token && !pendingStaff.invite_accepted_at)
      const isPending2 = Boolean(acceptedStaff.invite_token && !acceptedStaff.invite_accepted_at)

      expect(isPending1).toBe(true)
      expect(isPending2).toBe(false)
    })
  })

  describe('Invite URL Resolution', () => {
    it('constructs a full absolute URL for invite tokens', () => {
      const token = 'eeff5a67c45b8b4dc75c07f7216bf7a684d68724a4f578370c7880f2ccf73beb'
      const url = resolveAppUrl(`/invite?token=${token}`)
      expect(url).toMatch(/^https?:\/\/.+\/invite\?token=[a-f0-9]+$/)
      expect(url).not.toContain('http:///')
    })
  })
})

