import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppointmentCard } from '@/features/calendar/components/AppointmentCard'
import type { ApiAppointment } from '@/features/calendar/types'

const mockAppointment: ApiAppointment = {
  id: 'appt1',
  projectId: 'p1',
  kind: 'session',
  projectPosition: null,
  finalPrice: null,
  chargeWaived: false,
  projectBalance: null,
  customerId: 'c1',
  chatId: 'chat1',
  staffId: 'staff1',
  staffName: 'איתי חיילי',
  type: 'tattoo',
  date: '2026-10-15',
  timeSlot: '14:00',
  status: 'confirmed',
  createdAt: '2026-10-01T10:00:00Z',
  leadName: 'רועי כהן',
  leadPhone: '+972501234567',
  style: 'סנונית אולד סקול',
  priceMin: 800,
  priceMax: 1200,
  depositAmount: 200,
  hasDeposit: true,
  durationMinutes: 120,
  slotConfirmed: true,
  notes: null,
  isException: false,
  source: 'staff_manual',
}

describe('AppointmentCard', () => {
  it('renders mode="chip" with Impeccable design system classes, client name, and time', () => {
    const html = renderToStaticMarkup(
      <AppointmentCard
        mode="chip"
        appointment={mockAppointment}
        onSelect={() => {}}
      />,
    )

    expect(html).toContain('רועי כהן')
    expect(html).toContain('14:00')
    // Elevated surfaces matching system design
    expect(html).toContain('bg-white')
    expect(html).toContain('text-zinc-900')
    expect(html).toContain('dark:bg-[#18181b]')
    expect(html).toContain('dark:text-zinc-100')
  })

  it('renders mode="chip" with prominent completion checkmark when status is completed', () => {
    const html = renderToStaticMarkup(
      <AppointmentCard
        mode="chip"
        appointment={{ ...mockAppointment, status: 'completed' }}
        onSelect={() => {}}
      />,
    )

    expect(html).toContain('title="פגישה הושלמה"')
    expect(html).toContain('text-emerald-600')
    expect(html).toContain('dark:text-emerald-400')
  })

  it('renders mode="block" for week/day grid with time range and container styling', () => {
    const html = renderToStaticMarkup(
      <AppointmentCard
        mode="block"
        appointment={mockAppointment}
        top={100}
        height={60}
        onSelect={() => {}}
        isOverflowSlot={true}
        overflowCount={2}
        onOverflowClick={() => {}}
      />,
    )

    expect(html).toContain('רועי כהן')
    expect(html).toContain('14:00 – 16:00')
    expect(html).toContain('bg-white')
    expect(html).toContain('dark:bg-[#18181b]')
    expect(html).toContain('+2')
  })

  it('renders mode="block" with completed checkmark and label when status is completed', () => {
    const html = renderToStaticMarkup(
      <AppointmentCard
        mode="block"
        appointment={{ ...mockAppointment, status: 'completed' }}
        top={100}
        height={60}
        onSelect={() => {}}
      />,
    )

    expect(html).toContain('title="פגישה הושלמה"')
    expect(html).toContain('הושלם')
    expect(html).toContain('text-emerald-600')
  })

  it('renders mode="block" compact height when height < 56px', () => {
    const html = renderToStaticMarkup(
      <AppointmentCard
        mode="block"
        appointment={mockAppointment}
        top={50}
        height={40}
        onSelect={() => {}}
      />,
    )

    expect(html).toContain('רועי כהן')
    expect(html).toContain('items-center')
  })

  it('renders mode="row" with rich details including duration and client info', () => {
    const html = renderToStaticMarkup(
      <AppointmentCard
        mode="row"
        appointment={mockAppointment}
        onSelect={() => {}}
      />,
    )

    expect(html).toContain('רועי כהן')
    expect(html).toContain('סנונית אולד סקול')
    expect(html).toContain('איתי חיילי')
    expect(html).toContain('bg-white')
    expect(html).toContain('dark:bg-[#18181b]')
  })

  it('renders mode="row" with prominent status badge when status is completed', () => {
    const html = renderToStaticMarkup(
      <AppointmentCard
        mode="row"
        appointment={{ ...mockAppointment, status: 'completed' }}
        onSelect={() => {}}
      />,
    )

    expect(html).toContain('text-emerald-700')
    expect(html).toContain('dark:text-emerald-400')
    expect(html).toContain('הושלם')
  })
})
