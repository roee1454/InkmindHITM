import { describe, expect, it } from 'vitest'
import { nextSessionValues, tattooAfterConsultationValues } from '@/features/calendar/utils/follow-up'
import type { ApiAppointment } from '@/features/calendar/types'

const base = {
  id: 'a1',
  projectId: 'p1',
  customerId: 'c1',
  chatId: 'chat1',
  leadName: 'דנה',
  leadPhone: '+972500000000',
  staffId: 's1',
  style: 'שרוול יפני',
  durationMinutes: 240,
  hasDeposit: true,
  depositAmount: 200,
} as ApiAppointment

describe('booking a follow-up in the same project', () => {
  it('books the next session confirmed, in the same project, with the same artist and length', () => {
    expect(nextSessionValues({ ...base, kind: 'session' })).toMatchObject({
      projectId: 'p1',
      customerId: 'c1',
      staffId: 's1',
      durationMinutes: 240,
      tattooDescription: 'שרוול יפני',
      // A pending one would be released after 48 hours, and get no reminders.
      status: 'confirmed',
      depositAmount: null,
    })
  })

  it('books the tattoo after a consultation as pending, carrying the consultation deposit', () => {
    expect(tattooAfterConsultationValues({ ...base, kind: 'consultation' })).toMatchObject({
      projectId: 'p1',
      status: 'pending',
      durationMinutes: 180,
      depositAmount: 200,
      notes: 'שולמה מקדמת סקיצה בסך ₪200 לקיזוז',
    })
  })
})
