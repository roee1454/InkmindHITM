import { describe, expect, it } from 'vitest'
import {
  getAppointmentStatusVisual,
  formatAppointmentTimeRange,
  formatAppointmentDurationLabel,
  formatAppointmentPrice,
  buildAppointmentTooltip,
} from '@/features/calendar/utils/appointment-status'
import type { ApiAppointment } from '@/features/calendar/types'

describe('appointment-status utils', () => {
  it('returns correct visual configuration for each status', () => {
    const confirmed = getAppointmentStatusVisual('confirmed')
    expect(confirmed.label).toBe('מאושר')
    expect(confirmed.isCancelled).toBe(false)
    expect(confirmed.isPending).toBe(false)

    const pending = getAppointmentStatusVisual('pending')
    expect(pending.label).toBe('ממתין לאישור')
    expect(pending.isPending).toBe(true)

    const cancelled = getAppointmentStatusVisual('cancelled')
    expect(cancelled.label).toBe('בוטל')
    expect(cancelled.isCancelled).toBe(true)

    const completed = getAppointmentStatusVisual('completed')
    expect(completed.label).toBe('הושלם')
    expect(completed.isCompleted).toBe(true)

    const noShow = getAppointmentStatusVisual('no_show')
    expect(noShow.label).toBe('לא הגיע')
    expect(noShow.isCancelled).toBe(true)
  })

  it('formats time range accurately', () => {
    expect(formatAppointmentTimeRange('10:00', 60)).toBe('10:00 – 11:00')
    expect(formatAppointmentTimeRange('14:30', 90)).toBe('14:30 – 16:00')
    expect(formatAppointmentTimeRange('18:00', 30)).toBe('18:00 – 18:30')
  })

  it('formats duration labels in natural Hebrew', () => {
    expect(formatAppointmentDurationLabel(30)).toBe('30 דק׳')
    expect(formatAppointmentDurationLabel(60)).toBe('שעה')
    expect(formatAppointmentDurationLabel(120)).toBe('שעתיים')
    expect(formatAppointmentDurationLabel(180)).toBe('3 שעות')
  })

  it('formats price display correctly', () => {
    expect(formatAppointmentPrice(null, null)).toBeNull()
    expect(formatAppointmentPrice(null, 0)).toBe('ללא עלות')
    expect(formatAppointmentPrice(500, 500)).toBe('₪500')
    expect(formatAppointmentPrice(500, 800)).toBe('₪500 - ₪800')
    expect(formatAppointmentPrice(600, null)).toBe('החל מ-₪600')
    expect(formatAppointmentPrice(null, 1000)).toBe('₪1,000')
  })

  it('builds comprehensive tooltip string', () => {
    const appt: ApiAppointment = {
      id: 'appt-1',
      projectId: null,
      kind: 'session',
      projectPosition: null,
      finalPrice: null,
      chargeWaived: false,
      projectBalance: null,
      customerId: 'cust-1',
      chatId: 'chat-1',
      staffId: 'staff-1',
      staffName: 'אלכס',
      type: 'tattoo',
      date: '2026-09-22',
      timeSlot: '11:00',
      durationMinutes: 120,
      status: 'confirmed',
      createdAt: '2026-09-20T10:00:00Z',
      leadName: 'דניאל כהן',
      leadPhone: '+972501234567',
      style: 'קעקוע יפני שרוול',
      priceMin: 1200,
      priceMax: 1500,
      depositAmount: 300,
      hasDeposit: true,
      slotConfirmed: true,
      notes: 'רגישות לצבע אדום',
      isException: false,
      source: 'staff_manual',
      healthDeclarationSigned: true,
    }

    const tooltip = buildAppointmentTooltip(appt)
    expect(tooltip).toContain('11:00 – 13:00')
    expect(tooltip).toContain('סשן קעקוע')
    expect(tooltip).toContain('דניאל כהן')
    expect(tooltip).toContain('אלכס')
    expect(tooltip).toContain('מקדמה שולמה ✓')
    expect(tooltip).toContain('הצהרת בריאות חתומה ✓')
    expect(tooltip).toContain('סטטוס: מאושר')
    expect(tooltip).toContain('רגישות לצבע אדום')
  })
})

