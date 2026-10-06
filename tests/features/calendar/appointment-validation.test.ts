import { describe, expect, it } from 'vitest'
import {
  validateCustomerDateTimeStep,
  validatePricingDepositStep,
  validateStaffDurationStep,
} from '@/features/calendar/utils/appointment-validation'
import type { AppointmentFormValues } from '@/features/calendar/types'

const baseValues: AppointmentFormValues = {
  customerId: 'cust1',
  chatId: null,
  leadName: 'ישראל ישראלי',
  leadPhone: '+972501234567',
  type: 'tattoo',
  date: '2026-10-15',
  timeSlot: '14:00',
  staffId: 'staff1',
  durationMinutes: 180,
  tattooDescription: 'סנונית',
  priceMinIls: 1000,
  priceMaxIls: 1500,
  depositAmount: 300,
  status: 'pending',
  depositPaid: false,
  notes: '',
  allowException: false,
}

describe('appointment creation wizard validations', () => {
  describe('validateCustomerDateTimeStep', () => {
    it('accepts complete customer, date, and timeslot', () => {
      expect(validateCustomerDateTimeStep(baseValues).valid).toBe(true)
    })

    it('rejects missing customerId', () => {
      const res = validateCustomerDateTimeStep({ ...baseValues, customerId: null })
      expect(res.valid).toBe(false)
      expect(res.error).toBe('נא לבחור לקוח, תאריך ושעה')
    })

    it('rejects missing date or timeslot', () => {
      expect(validateCustomerDateTimeStep({ ...baseValues, date: '' }).valid).toBe(false)
      expect(validateCustomerDateTimeStep({ ...baseValues, timeSlot: '' }).valid).toBe(false)
    })

    it('rejects dates strictly before minDate for follow-up appointments', () => {
      const res = validateCustomerDateTimeStep({ ...baseValues, date: '2026-10-14', minDate: '2026-10-15' })
      expect(res.valid).toBe(false)
      expect(res.error).toBe('לא ניתן לקבוע פגישת המשך לפני תאריך הפגישה הקודמת')
    })

    it('accepts dates on or after minDate for follow-up appointments', () => {
      const sameDay = validateCustomerDateTimeStep({ ...baseValues, date: '2026-10-15', minDate: '2026-10-15' })
      expect(sameDay.valid).toBe(true)

      const futureDay = validateCustomerDateTimeStep({ ...baseValues, date: '2026-10-20', minDate: '2026-10-15' })
      expect(futureDay.valid).toBe(true)
    })
  })

  describe('validateStaffDurationStep', () => {
    it('requires a staff member for tattoo appointments', () => {
      const emptyStaff = validateStaffDurationStep({ ...baseValues, staffId: null })
      expect(emptyStaff.valid).toBe(false)
      expect(emptyStaff.error).toBe('נא לבחור מקעקע עבור פגישת הקעקוע')

      const noneStaff = validateStaffDurationStep({ ...baseValues, staffId: 'none' })
      expect(noneStaff.valid).toBe(false)
      expect(noneStaff.error).toBe('נא לבחור מקעקע עבור פגישת הקעקוע')
    })

    it('allows sketch appointment without staff', () => {
      expect(validateStaffDurationStep({ ...baseValues, type: 'sketch', staffId: null }).valid).toBe(true)
    })

    it('validates closure and working hours exceptions', () => {
      const closed = validateStaffDurationStep(baseValues, { isStudioClosed: true })
      expect(closed.valid).toBe(false)
      expect(closed.error).toContain('שהסטודיו סגור')

      const closedWithException = validateStaffDurationStep({ ...baseValues, allowException: true }, { isStudioClosed: true })
      expect(closedWithException.valid).toBe(true)

      const offHours = validateStaffDurationStep(baseValues, { fitsWorkingHours: false })
      expect(offHours.valid).toBe(false)
      expect(offHours.error).toContain('מחוץ לשעות העבודה')
    })
  })

  describe('validatePricingDepositStep', () => {
    it('passes for a valid tattoo session with price range and deposit', () => {
      expect(validatePricingDepositStep(baseValues).valid).toBe(true)
    })

    it('requires positive priceMin and priceMax for tattoo session', () => {
      const noMin = validatePricingDepositStep({ ...baseValues, priceMinIls: null })
      expect(noMin.valid).toBe(false)
      expect(noMin.error).toBe('נא להזין מחיר מינימלי התחלתי')

      const noMax = validatePricingDepositStep({ ...baseValues, priceMaxIls: 0 })
      expect(noMax.valid).toBe(false)
      expect(noMax.error).toBe('נא להזין מחיר מקסימלי התחלתי')

      const invertedRange = validatePricingDepositStep({ ...baseValues, priceMinIls: 2000, priceMaxIls: 1500 })
      expect(invertedRange.valid).toBe(false)
      expect(invertedRange.error).toBe('המחיר המקסימלי אינו יכול להיות נמוך מהמחיר המינימלי')
    })

    it('requires positive deposit for tattoo session', () => {
      const noDeposit = validatePricingDepositStep({ ...baseValues, depositAmount: null })
      expect(noDeposit.valid).toBe(false)
      expect(noDeposit.error).toBe('נא להזין סכום מקדמה לפגישת הקעקוע')

      const zeroDeposit = validatePricingDepositStep({ ...baseValues, depositAmount: 0 })
      expect(zeroDeposit.valid).toBe(false)
      expect(zeroDeposit.error).toBe('נא להזין סכום מקדמה לפגישת הקעקוע')
    })

    it('allows sketch appointment without price range or deposit', () => {
      const sketch = validatePricingDepositStep({
        ...baseValues,
        type: 'sketch',
        priceMinIls: null,
        priceMaxIls: null,
        depositAmount: null,
      })
      expect(sketch.valid).toBe(true)
    })

    it('allows confirmed follow-up sessions within a project without requiring a new deposit', () => {
      const followUp = validatePricingDepositStep({
        ...baseValues,
        projectId: 'project_123',
        status: 'confirmed',
        priceMinIls: 1200,
        priceMaxIls: 1500,
        depositAmount: null,
      })
      expect(followUp.valid).toBe(true)
    })
  })
})
