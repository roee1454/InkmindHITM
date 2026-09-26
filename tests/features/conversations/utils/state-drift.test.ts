import { describe, expect, it } from 'vitest'
import { detectStateDrift, DRIFT_GRACE_MINUTES } from '@/features/conversations/utils/state-drift'
import type { DriftFacts } from '@/features/conversations/utils/state-drift'
import { canTransition } from '@/features/conversations/server/state-machine'
import type { ConversationState } from '@/integrations/ai/prompts'

const now = new Date('2026-09-25T12:00:00Z')
const tomorrow = '2026-09-26T12:00:00Z'
const anHourAgo = '2026-09-25T11:00:00Z'
const facts = (overrides: Partial<DriftFacts> = {}): DriftFacts => ({ openAppointments: [], activeProject: null, stateEnteredAt: '2026-09-24T12:00:00Z', ...overrides })
const drift = (state: ConversationState, f: DriftFacts, hasActiveProject = false) => detectStateDrift({ state, hasActiveProject, facts: f, now })

const openProject = (lastFinishedKind: 'consultation' | 'session' | null) => ({ closed: false, lastFinishedKind })
const closedProject = { closed: true, lastFinishedKind: 'session' as const }

describe('detectStateDrift', () => {
  const holdFlow: ConversationState[] = ['AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION']

  it('leaves a booking step alone while its hold exists', () => {
    for (const state of holdFlow) expect(drift(state, facts({ openAppointments: [{ status: 'pending', startsAt: tomorrow }] }))).toBeNull()
  })

  it('sends a booking step back to collecting info once its hold is gone (deleted, cancelled or expired)', () => {
    for (const state of holdFlow) expect(drift(state, facts())).toEqual({ to: 'COLLECTING_INFO', clearProject: false, reason: 'reconciler_hold_gone' })
  })

  it('moves a booking step on to the booked appointment when staff confirmed it by hand', () => {
    for (const state of holdFlow) expect(drift(state, facts({ openAppointments: [{ status: 'confirmed', startsAt: tomorrow }] }))?.to).toBe('AWAITING_APPOINTMENT')
  })

  it('moves a conversation waiting for an appointment that no longer exists the way an ended appointment would', () => {
    expect(drift('AWAITING_APPOINTMENT', facts({ openAppointments: [{ status: 'confirmed', startsAt: tomorrow }] }))).toBeNull()
    expect(drift('AWAITING_APPOINTMENT', facts({ activeProject: openProject('consultation') }))?.to).toBe('WANTS_TO_BOOK')
    expect(drift('AWAITING_APPOINTMENT', facts({ activeProject: openProject('session') }))?.to).toBe('PROJECT_IN_PROGRESS')
    expect(drift('AWAITING_APPOINTMENT', facts({ activeProject: openProject(null) }))?.to).toBe('COMPLETED')
    expect(drift('AWAITING_APPOINTMENT', facts({ activeProject: closedProject }))?.to).toBe('COMPLETED')
  })

  it('ends the wait between sessions once the project is completed or lost', () => {
    expect(drift('PROJECT_IN_PROGRESS', facts({ activeProject: openProject('session') }))).toBeNull()
    expect(drift('PROJECT_IN_PROGRESS', facts({ activeProject: closedProject }))).toEqual({ to: 'COMPLETED', clearProject: false, reason: 'reconciler_project_closed' })
    expect(drift('PROJECT_IN_PROGRESS', facts({ activeProject: null }))?.to).toBe('COMPLETED')
  })

  it('moves a conversation between sessions to the booked appointment when staff booked the next session', () => {
    const open = openProject('session')
    expect(drift('PROJECT_IN_PROGRESS', facts({ activeProject: open, openAppointments: [{ status: 'confirmed', startsAt: tomorrow }] }))).toEqual({
      to: 'AWAITING_APPOINTMENT',
      clearProject: false,
      reason: 'reconciler_session_booked',
    })
    // The session that just ended (still confirmed, not closed yet) isn't the next one.
    expect(drift('PROJECT_IN_PROGRESS', facts({ activeProject: open, openAppointments: [{ status: 'confirmed', startsAt: anHourAgo }] }))).toBeNull()
    // A hold staff left pending isn't booked yet.
    expect(drift('PROJECT_IN_PROGRESS', facts({ activeProject: open, openAppointments: [{ status: 'pending', startsAt: tomorrow }] }))).toBeNull()
  })

  it('acts at once after a change staff made themselves, with no grace period', () => {
    const justEntered = new Date(now.getTime() - 60_000).toISOString()
    const f = facts({ activeProject: openProject('session'), stateEnteredAt: justEntered, openAppointments: [{ status: 'confirmed', startsAt: tomorrow }] })
    expect(detectStateDrift({ state: 'PROJECT_IN_PROGRESS', hasActiveProject: true, facts: f, now })).toBeNull()
    expect(detectStateDrift({ state: 'PROJECT_IN_PROGRESS', hasActiveProject: true, facts: f, now, graceMinutes: 0 })?.to).toBe('AWAITING_APPOINTMENT')
  })

  it('detaches a closed project from a new booking without moving the state', () => {
    expect(drift('COLLECTING_INFO', facts({ activeProject: closedProject }), true)).toEqual({ to: null, clearProject: true, reason: 'reconciler_project_closed' })
    expect(drift('COLLECTING_INFO', facts({ activeProject: openProject(null) }), true)).toBeNull()
    expect(drift('COLLECTING_INFO', facts(), false)).toBeNull()
  })

  it('leaves a state it only just entered alone, while its flow may still be finishing', () => {
    const justEntered = new Date(now.getTime() - (DRIFT_GRACE_MINUTES - 1) * 60_000).toISOString()
    expect(drift('AWAIT_PAYMENT', facts({ stateEnteredAt: justEntered }))).toBeNull()
    // Older conversations have no logged entry; they are checked.
    expect(drift('AWAIT_PAYMENT', facts({ stateEnteredAt: null }))?.to).toBe('COLLECTING_INFO')
  })

  it('has no rule for the other states', () => {
    for (const state of ['NEW', 'AWAIT_NPS_SCORE', 'COMPLETED'] as const) expect(drift(state, facts({ activeProject: closedProject }), true)).toBeNull()
  })

  it('only ever proposes a move the state machine accepts from the system', () => {
    const cases: Array<[ConversationState, DriftFacts]> = [
      ...holdFlow.flatMap((s): Array<[ConversationState, DriftFacts]> => [[s, facts()], [s, facts({ openAppointments: [{ status: 'confirmed', startsAt: tomorrow }] })]]),
      ['AWAITING_APPOINTMENT', facts({ activeProject: openProject('consultation') })],
      ['AWAITING_APPOINTMENT', facts({ activeProject: openProject('session') })],
      ['AWAITING_APPOINTMENT', facts()],
      ['PROJECT_IN_PROGRESS', facts({ activeProject: closedProject })],
      ['PROJECT_IN_PROGRESS', facts({ activeProject: openProject('session'), openAppointments: [{ status: 'confirmed', startsAt: tomorrow }] })],
    ]
    for (const [state, f] of cases) {
      const to = drift(state, f)?.to
      expect(to).toBeTruthy()
      expect(canTransition(state, to as ConversationState, 'system')).toBe(true)
    }
  })
})
