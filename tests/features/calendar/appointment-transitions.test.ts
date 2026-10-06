import { describe, expect, it } from 'vitest'
import { canChangeAppointmentStatus, statusChange } from '@/features/calendar/utils/appointment-transitions'

describe('statusChange', () => {
  it('carries the attribution the lifecycle hook logs', () => {
    expect(statusChange('confirmed', 'bot', 'confirm_booking_final')).toEqual({
      status: 'confirmed',
      status_actor: 'bot',
      status_reason: 'confirm_booking_final',
    })
  })

  it('lets a writer say who really cancelled, and trims long reasons', () => {
    expect(statusChange('cancelled', 'staff', 'x'.repeat(300), 'customer')).toMatchObject({ cancelled_by: 'customer' })
    expect(statusChange('cancelled', 'staff', 'x'.repeat(300)).status_reason).toHaveLength(200)
  })
})

describe('canChangeAppointmentStatus', () => {
  it('allows the everyday moves and corrections', () => {
    expect(canChangeAppointmentStatus('pending', 'confirmed')).toBe(true)
    expect(canChangeAppointmentStatus('confirmed', 'no_show')).toBe(true)
    expect(canChangeAppointmentStatus('completed', 'no_show')).toBe(true)
    expect(canChangeAppointmentStatus('cancelled', 'confirmed')).toBe(true)
    expect(canChangeAppointmentStatus('completed', 'completed')).toBe(true)
  })

  it('refuses edits that rewrite what happened', () => {
    expect(canChangeAppointmentStatus('completed', 'cancelled')).toBe(false)
    expect(canChangeAppointmentStatus('completed', 'pending')).toBe(false)
    expect(canChangeAppointmentStatus('cancelled', 'completed')).toBe(false)
    expect(canChangeAppointmentStatus('cancelled', 'no_show')).toBe(false)
  })
})
