import { describe, expect, it } from 'vitest'
import { appointmentKindLabel, computeProjectPositions } from '@/features/calendar/utils/project-position'
import type { ProjectAppointmentRef } from '@/features/calendar/utils/project-position'

const ref = (id: string, overrides: Partial<ProjectAppointmentRef>): ProjectAppointmentRef => ({
  id,
  projectId: 'p1',
  kind: 'session',
  status: 'confirmed',
  startTime: '2026-10-01T10:00:00.000Z',
  ...overrides,
})

describe('computeProjectPositions', () => {
  it('numbers sessions in time order and remembers the consultation before them', () => {
    const positions = computeProjectPositions([
      ref('s2', { startTime: '2026-11-01T10:00:00.000Z' }),
      ref('c', { kind: 'consultation', status: 'completed', startTime: '2026-09-01T10:00:00.000Z' }),
      ref('s1', { startTime: '2026-10-01T10:00:00.000Z' }),
    ])
    expect(positions.get('s1')).toEqual({ sessionNumber: 1, sessionCount: 2, hasConsultation: true, appointmentCount: 3 })
    expect(positions.get('s2')?.sessionNumber).toBe(2)
    expect(positions.get('c')?.sessionNumber).toBeNull()
  })

  it("doesn't count cancelled or missed sessions, so a rebooked session keeps its number", () => {
    const positions = computeProjectPositions([
      ref('cancelled', { status: 'cancelled', startTime: '2026-10-01T10:00:00.000Z' }),
      ref('rebooked', { startTime: '2026-10-08T10:00:00.000Z' }),
      ref('noshow-consult', { kind: 'consultation', status: 'no_show', startTime: '2026-09-01T10:00:00.000Z' }),
    ])
    expect(positions.get('rebooked')).toMatchObject({ sessionNumber: 1, sessionCount: 1, hasConsultation: false })
    expect(positions.get('cancelled')?.sessionNumber).toBeNull()
  })

  it('keeps projects apart and skips appointments without one', () => {
    const positions = computeProjectPositions([ref('a', { projectId: 'p1' }), ref('b', { projectId: 'p2' }), ref('loose', { projectId: null })])
    expect(positions.get('a')?.sessionCount).toBe(1)
    expect(positions.get('b')?.sessionCount).toBe(1)
    expect(positions.has('loose')).toBe(false)
  })
})

describe('appointmentKindLabel', () => {
  it('labels by kind and numbers sessions only inside a series', () => {
    const single = { sessionNumber: 1, sessionCount: 1, hasConsultation: false, appointmentCount: 1 }
    expect(appointmentKindLabel('consultation', null)).toBe('סקיצה')
    expect(appointmentKindLabel('touch_up', null)).toBe("טאץ'-אפ")
    expect(appointmentKindLabel('session', null)).toBe('קעקוע')
    expect(appointmentKindLabel('session', single)).toBe('קעקוע')
    expect(appointmentKindLabel('session', { ...single, hasConsultation: true })).toBe('סשן 1')
    expect(appointmentKindLabel('session', { ...single, sessionNumber: 2, sessionCount: 3 })).toBe('סשן 2')
  })
})
