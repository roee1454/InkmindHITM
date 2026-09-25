import { describe, expect, it } from 'vitest'
import { resolveInboundRouting } from '@/features/conversations/utils/inbound-routing'
import type { InboundFacts, InboundRoutingInput } from '@/features/conversations/utils/inbound-routing'

const now = new Date('2026-09-25T12:00:00Z')
const facts = (overrides: Partial<InboundFacts> = {}): InboundFacts => ({ hasUpcomingAppointment: false, activeProject: null, stateEnteredAt: null, ...overrides })
const input = (overrides: Partial<InboundRoutingInput> = {}): InboundRoutingInput => ({
  state: 'AWAITING_APPOINTMENT',
  status: 'bot_active',
  lastMessageAt: '2026-09-25T10:00:00Z',
  aiEnabled: true,
  facts: facts(),
  now,
  ...overrides,
})

describe('resolveInboundRouting', () => {
  it('changes nothing while the customer has an upcoming appointment', () => {
    expect(resolveInboundRouting(input({ status: 'closed', facts: facts({ hasUpcomingAppointment: true }) }))).toEqual({ transition: null, reactivateBot: false })
  })

  it('continues to booking the tattoo after a finished consultation, keeping the project', () => {
    const routing = resolveInboundRouting(input({ facts: facts({ activeProject: { closed: false, lastFinishedKind: 'consultation' } }) }))
    expect(routing.transition).toEqual({ to: 'WANTS_TO_BOOK', reason: 'inbound_after_consultation', clearProject: false, resetBooking: false })
  })

  it('starts over after a session, keeping an open multi-session project but not a finished one', () => {
    expect(resolveInboundRouting(input({ facts: facts({ activeProject: { closed: false, lastFinishedKind: 'session' } }) })).transition).toMatchObject({ to: 'NEW', clearProject: false, resetBooking: true })
    expect(resolveInboundRouting(input({ facts: facts({ activeProject: { closed: true, lastFinishedKind: 'session' } }) })).transition).toMatchObject({ to: 'NEW', clearProject: true })
    expect(resolveInboundRouting(input({ facts: facts({ activeProject: null }) })).transition).toMatchObject({ to: 'NEW', clearProject: true })
  })

  it('starts over after a completed funnel', () => {
    expect(resolveInboundRouting(input({ state: 'COMPLETED' })).transition).toEqual({ to: 'NEW', reason: 'inbound_after_completed', clearProject: true, resetBooking: true })
  })

  it('keeps waiting for a feedback answer for a week, then starts over', () => {
    expect(resolveInboundRouting(input({ state: 'AWAIT_NPS_SCORE', facts: facts({ stateEnteredAt: '2026-09-22T12:00:00Z' }) })).transition).toBeNull()
    expect(resolveInboundRouting(input({ state: 'AWAIT_NPS_SCORE', facts: facts({ stateEnteredAt: '2026-09-10T12:00:00Z' }) })).transition).toMatchObject({ to: 'NEW' })
    expect(resolveInboundRouting(input({ state: 'AWAIT_NPS_SCORE', facts: facts({ stateEnteredAt: null }) })).transition).toMatchObject({ to: 'NEW' })
  })

  it('leaves a conversation in the middle of booking alone', () => {
    for (const state of ['NEW', 'WANTS_TO_BOOK', 'COLLECTING_INFO', 'AWAIT_PAYMENT'] as const) {
      expect(resolveInboundRouting(input({ state })).transition).toBeNull()
    }
  })

  it('hands a closed or long-untouched staff conversation back to the bot, when AI is on', () => {
    expect(resolveInboundRouting(input({ state: 'NEW', status: 'closed' })).reactivateBot).toBe(true)
    expect(resolveInboundRouting(input({ state: 'NEW', status: 'staff_handling', lastMessageAt: '2026-09-24T10:00:00Z' })).reactivateBot).toBe(true)
    expect(resolveInboundRouting(input({ state: 'NEW', status: 'staff_handling', lastMessageAt: '2026-09-25T08:00:00Z' })).reactivateBot).toBe(false)
    expect(resolveInboundRouting(input({ state: 'NEW', status: 'staff_handling', lastMessageAt: null })).reactivateBot).toBe(true)
    expect(resolveInboundRouting(input({ state: 'NEW', status: 'closed', aiEnabled: false })).reactivateBot).toBe(false)
  })
})
