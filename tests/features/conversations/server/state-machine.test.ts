import { describe, expect, it, vi } from 'vitest'
import { InvalidTransitionError, TRANSITIONS, transition } from '@/features/conversations/server/state-machine'
import type { ConversationState } from '@/integrations/ai/prompts'

vi.mock('@/features/notifications/server/notifications', () => ({
  addSystemNotification: vi.fn().mockResolvedValue(null),
}))

/** Minimal fake PocketBase: one conversation row with a controllable state. */
function fakeSu(state: string) {
  const updates: Array<Record<string, unknown>> = []
  const su = {
    collection: (name: string) => ({
      getOne: async () => ({ id: 'conv1', state }),
      update: async (_id: string, fields: Record<string, unknown>) => {
        updates.push({ collection: name, ...fields })
        return fields
      },
      create: async (fields: Record<string, unknown>) => fields, // notifications on reject
    }),
  }
  return { su: su as never, updates }
}

describe('TRANSITIONS table', () => {
  it('covers every conversation state', () => {
    const states: ConversationState[] = [
      'NEW', 'WANTS_TO_BOOK', 'COLLECTING_INFO', 'WAITLIST', 'AWAIT_PRICE_OFFER',
      'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION',
      'AWAITING_APPOINTMENT', 'AWAIT_NPS_SCORE', 'COMPLETED',
    ]
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...states].sort())
  })

  it('every target state is itself a valid state (no dead ends into typos)', () => {
    const valid = new Set(Object.keys(TRANSITIONS))
    for (const targets of Object.values(TRANSITIONS)) {
      for (const t of targets) expect(valid.has(t)).toBe(true)
    }
  })
})

describe('transition()', () => {
  it('applies a legal transition with extra fields in one update', async () => {
    const { su, updates } = fakeSu('COLLECTING_INFO')
    const { from } = await transition(su, 'conv1', 'AWAIT_PRICE_OFFER', {
      actor: 'bot',
      reason: 'test',
      extraFields: { tattoo_info: { x: 1 } },
    })
    expect(from).toBe('COLLECTING_INFO')
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ state: 'AWAIT_PRICE_OFFER', tattoo_info: { x: 1 } })
  })

  it('rejects the funnel corruptions this module exists to stop', async () => {
    const illegal: Array<[string, ConversationState]> = [
      ['COMPLETED', 'AWAIT_PAYMENT'],
      ['NEW', 'AWAIT_FINAL_CONFIRMATION'],
      ['AWAIT_NPS_SCORE', 'COLLECTING_INFO'],
      ['COLLECTING_INFO', 'AWAITING_APPOINTMENT'],
    ]
    for (const [fromState, to] of illegal) {
      const { su, updates } = fakeSu(fromState)
      await expect(
        transition(su, 'conv1', to, { actor: 'bot', reason: 'test' }),
      ).rejects.toBeInstanceOf(InvalidTransitionError)
      // The state write must not have happened (index 0 would be it; the reject-path
      // notification goes through create(), not update()).
      expect(updates.filter((u) => 'state' in u)).toHaveLength(0)
    }
  })

  it('self-transitions are idempotent no-ops that still write extra fields', async () => {
    const { su, updates } = fakeSu('AWAIT_PAYMENT')
    await transition(su, 'conv1', 'AWAIT_PAYMENT', {
      actor: 'staff',
      reason: 'requote',
      extraFields: { last_message_at: 'now' },
    })
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ state: 'AWAIT_PAYMENT', last_message_at: 'now' })
  })

  it('treats an unknown stored state as NEW (matches the agent fallback)', async () => {
    const { su } = fakeSu('garbage_state')
    const { from } = await transition(su, 'conv1', 'COLLECTING_INFO', { actor: 'system', reason: 'test' })
    expect(from).toBe('NEW')
  })

  it('syncs customer lead_stage on transition', async () => {
    const customerUpdates: Array<Record<string, unknown>> = []
    const su = {
      collection: (name: string) => ({
        getOne: async (id: string) => {
          if (name === 'conversations') return { id: 'conv1', state: 'NEW', customer: 'cust1' }
          if (name === 'customers') return { id: 'cust1', lead_stage: 'new' }
          return { id }
        },
        update: async (_id: string, fields: Record<string, unknown>) => {
          if (name === 'customers') customerUpdates.push(fields)
          return fields
        },
        create: async (fields: Record<string, unknown>) => fields,
      }),
    }

    await transition(su as never, 'conv1', 'WANTS_TO_BOOK', { actor: 'bot', reason: 'start_booking' })
    expect(customerUpdates).toHaveLength(1)
    expect(customerUpdates[0]).toMatchObject({ lead_stage: 'WANTS_TO_BOOK' })
  })

  it('allows AWAIT_FINAL_CONFIRMATION to transition to AWAIT_PAYMENT and AWAIT_PRICE_OFFER', async () => {
    const { su, updates } = fakeSu('AWAIT_FINAL_CONFIRMATION')
    const { from } = await transition(su, 'conv1', 'AWAIT_PAYMENT', {
      actor: 'staff',
      reason: 'reopen_payment',
    })
    expect(from).toBe('AWAIT_FINAL_CONFIRMATION')
    expect(updates[0]).toMatchObject({ state: 'AWAIT_PAYMENT' })
  })

  it('allows staff override from AWAITING_APPOINTMENT to AWAIT_PAYMENT without throwing', async () => {
    const { su, updates } = fakeSu('AWAITING_APPOINTMENT')
    const { from } = await transition(su, 'conv1', 'AWAIT_PAYMENT', {
      actor: 'staff',
      reason: 'staff_quote_adjustment',
    })
    expect(from).toBe('AWAITING_APPOINTMENT')
    expect(updates[0]).toMatchObject({ state: 'AWAIT_PAYMENT' })
  })
})

