import { describe, expect, it } from 'vitest'
import { appointmentVisual } from '#/features/calendar/utils/appointment-visual'
import { artistColor } from '#/features/calendar/utils/artist-colors'
import type { ApiAppointment, AppointmentKind, AppointmentStatus } from '#/features/calendar/types'

const NOW = new Date('2026-10-01T15:00:00').getTime()

const appointment = (status: AppointmentStatus, kind: AppointmentKind = 'session', timeSlot = '10:00'): ApiAppointment =>
  ({ id: 'a1', kind, status, date: '2026-10-01', timeSlot, durationMinutes: 120 }) as ApiAppointment

describe('appointment visual language (track-b B6.8)', () => {
  it('flags a finished session that nobody closed — the one thing staff must act on', () => {
    expect(appointmentVisual(appointment('confirmed'), NOW).marker).toBe('close_out')
  })

  it('flags an unapproved hold, and ranks closing money above it', () => {
    // A future hold can't need closing, so it shows the approval marker.
    expect(appointmentVisual(appointment('pending', 'session', '23:00'), NOW).marker).toBe('approval')
    // A past confirmed session outranks everything else.
    expect(appointmentVisual(appointment('confirmed', 'session', '09:00'), NOW).marker).toBe('close_out')
  })

  it('shows no marker for a confirmed appointment still ahead, or a consultation', () => {
    expect(appointmentVisual(appointment('confirmed', 'session', '23:00'), NOW).marker).toBeNull()
    expect(appointmentVisual(appointment('confirmed', 'consultation', '09:00'), NOW).marker).toBeNull()
  })

  it('recedes a settled or cancelled appointment instead of adding another badge', () => {
    expect(appointmentVisual(appointment('completed'), NOW)).toMatchObject({ marker: null, muted: true, struck: false })
    expect(appointmentVisual(appointment('cancelled'), NOW)).toMatchObject({ marker: null, muted: true, struck: true })
    expect(appointmentVisual(appointment('no_show'), NOW)).toMatchObject({ marker: null, muted: true, struck: true })
  })

  it('dashes the border only while approval is pending', () => {
    expect(appointmentVisual(appointment('pending'), NOW).dashed).toBe(true)
    expect(appointmentVisual(appointment('confirmed'), NOW).dashed).toBe(false)
  })
})

describe('artist colours carry identity, not status', () => {
  it('gives the same artist the same surface every time, and an unassigned one a neutral surface', () => {
    expect(artistColor('st_abc').surface).toBe(artistColor('st_abc').surface)
    expect(artistColor('st_abc').surface).toContain('artist-')
    expect(artistColor(null).surface).not.toContain('artist-')
  })

  it('never borrows a status role for an artist', () => {
    for (const id of ['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff', 'ggggggg', 'hhhhhhhh']) {
      const { surface, dot } = artistColor(id)
      expect(`${surface} ${dot}`).not.toMatch(/status-|destructive|warning|success/)
    }
  })
})
