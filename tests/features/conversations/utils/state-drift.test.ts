import { describe, expect, it } from 'vitest'
import { detectStateDrift, DRIFT_GRACE_MINUTES } from '@/features/conversations/utils/state-drift'
import type { DriftFacts } from '@/features/conversations/utils/state-drift'
import { canTransition } from '@/features/conversations/server/state-machine'
import type { ConversationState } from '@/integrations/ai/prompts'

const now = new Date('2026-09-25T12:00:00Z')
const facts = (overrides: Partial<DriftFacts> = {}): DriftFacts => ({ openAppointments: [], activeProject: null, stateEnteredAt: '2026-09-24T12:00:00Z', ...overrides })
const drift = (state: ConversationState, f: DriftFacts, hasActiveProject = false) => detectStateDrift({ state, hasActiveProject, facts: f, now })

const openProject = (lastFinishedKind: 'consultation' | 'session' | null) => ({ closed: false, lastFinishedKind })
const closedProject = { closed: true, lastFinishedKind: 'session' as const }

describe('detectStateDrift', () => {
  const holdFlow: ConversationState[] = ['AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION']

  it('leaves a booking step alone while its hold exists', () => {
    for (const state of holdFlow) expect(drift(state, facts({ openAppointments: [{ status: 'pending' }] }))).toBeNull()
  })

  it('sends a booking step back to collecting info once its hold is gone (deleted, cancelled or expired)', () => {
    for (const state of holdFlow) expect(drift(state, facts())).toEqual({ to: 'COLLECTING_INFO', clearProject: false, reason: 'reconciler_hold_gone' })
  })

  it('moves a booking step on to the booked appointment when staff confirmed it by hand', () => {
    for (const state of holdFlow) expect(drift(state, facts({ openAppointments: [{ status: 'confirmed' }] }))?.to).toBe('AWAITING_APPOINTMENT')
  })

  it('moves a conversation waiting for an appointment that no longer exists the way an ended appointment would', () => {
    expect(drift('AWAITING_APPOINTMENT', facts({ openAppointments: [{ status: 'confirmed' }] }))).toBeNull()
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
      ...holdFlow.flatMap((s): Array<[ConversationState, DriftFacts]> => [[s, facts()], [s, facts({ openAppointments: [{ status: 'confirmed' }] })]]),
      ['AWAITING_APPOINTMENT', facts({ activeProject: openProject('consultation') })],
      ['AWAITING_APPOINTMENT', facts({ activeProject: openProject('session') })],
      ['AWAITING_APPOINTMENT', facts()],
      ['PROJECT_IN_PROGRESS', facts({ activeProject: closedProject })],
    ]
    for (const [state, f] of cases) {
      const to = drift(state, f)?.to
      expect(to).toBeTruthy()
      expect(canTransition(state, to as ConversationState, 'system')).toBe(true)
    }
  })
})
