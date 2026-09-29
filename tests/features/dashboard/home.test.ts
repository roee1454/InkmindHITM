import { describe, expect, it } from 'vitest'
import { nextAppointment, projectsNeedingAttention, stageCounts, todaysAppointments, waitingConversations } from '@/features/dashboard/utils/home'
import type { UIConversation } from '@/features/conversations/types'
import type { PipelineProject } from '@/features/projects/types'
import type { ApiAppointment } from '@/features/calendar/types'

const NOW = new Date('2026-09-29T12:00:00')

const conversation = (id: string, fields: Partial<UIConversation>): UIConversation => ({
  id,
  customerName: `לקוח ${id}`,
  customerPhone: '972500000000',
  status: 'bot_active',
  state: 'COLLECTING_INFO',
  staffCallReason: null,
  lastMessageAt: null,
  lastMessagePreview: '',
  lastMessageSender: null,
  windowExpiresAt: null,
  unreadCount: 0,
  botTurnPhase: '',
  ...fields,
})

const project = (id: string, fields: Partial<PipelineProject>): PipelineProject => ({
  projectId: id,
  title: '',
  stage: 'booked',
  stageChangedAt: '2026-09-28T10:00:00',
  customerId: 'c',
  customerName: 'נועה',
  customerPhone: '050',
  source: null,
  conversationId: null,
  staffId: null,
  staffName: null,
  quoteMin: null,
  quoteMax: null,
  nextAppointmentAt: '2026-10-02T12:00:00',
  sessionsDone: 0,
  estimatedSessions: null,
  lastSessionAt: null,
  lostReason: null,
  lostNote: null,
  due: 0,
  credit: 0,
  ...fields,
})

const appointment = (id: string, date: string, timeSlot: string, fields: Partial<ApiAppointment> = {}) =>
  ({ id, date, timeSlot, status: 'confirmed', staffId: 's1', ...fields }) as ApiAppointment

describe('waitingConversations', () => {
  it('lists what the inbox files under "waiting", with its reason', () => {
    const result = waitingConversations([
      conversation('1', { state: 'AWAIT_PAYMENT' }),
      conversation('2', {}),
      conversation('3', { status: 'escalated', customerName: '' }),
    ])
    expect(result.map((c) => [c.id, c.reason])).toEqual([
      ['1', 'מקדמה לאישור'],
      ['3', 'ממתין למענה'],
    ])
    expect(result[1]?.name).toBe('972500000000')
  })
})

describe('projectsNeedingAttention', () => {
  it('puts money before a stall, in the board card words', () => {
    const result = projectsNeedingAttention(
      [
        project('stuck', { nextAppointmentAt: null }),
        project('fine', {}),
        project('owes', { due: 800 }),
      ],
      NOW,
    )
    expect(result.map((n) => [n.project.projectId, n.attention])).toEqual([
      ['owes', 'owes'],
      ['stuck', 'stuck'],
    ])
    expect(result[0]?.fact).toContain('800')
    expect(result[1]?.fact).toBe('סשן שעבר ולא נסגר')
  })
})

describe('today and next', () => {
  const all = [
    appointment('late', '2026-09-29', '17:00'),
    appointment('early', '2026-09-29', '09:00'),
    appointment('cancelled', '2026-09-29', '10:00', { status: 'cancelled' }),
    appointment('other-artist', '2026-09-29', '11:00', { staffId: 's2' }),
    appointment('tomorrow', '2026-09-30', '10:00'),
    appointment('yesterday', '2026-09-28', '10:00'),
  ]

  it('shows the studio to an admin and only their own chair to an artist, by time', () => {
    expect(todaysAppointments(all, { id: 's1', isAdmin: true }, NOW).map((a) => a.id)).toEqual(['early', 'other-artist', 'late'])
    expect(todaysAppointments(all, { id: 's1', isAdmin: false }, NOW).map((a) => a.id)).toEqual(['early', 'late'])
  })

  it('offers the first appointment after today', () => {
    expect(nextAppointment(all, { id: 's1', isAdmin: false }, NOW)?.id).toBe('tomorrow')
    expect(nextAppointment([], { id: 's1', isAdmin: true }, NOW)).toBeNull()
  })
})

describe('stageCounts', () => {
  it('counts leads, then the board open columns, the two consultation stages together', () => {
    const counts = stageCounts({
      leadsWithoutProject: [{ customerId: 'l', name: null, phone: '', source: null, conversationId: null, updatedAt: '2026-09-28T10:00:00' }],
      projects: [project('a', { stage: 'consultation_scheduled' }), project('b', { stage: 'consultation_done' }), project('c', { stage: 'completed' })],
    })
    expect(counts.map((c) => [c.id, c.count])).toEqual([
      ['leads', 1],
      ['inquiry', 0],
      ['consultation', 2],
      ['quoted', 0],
      ['booked', 0],
      ['in_progress', 0],
    ])
  })
})
