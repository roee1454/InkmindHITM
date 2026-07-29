import { describe, expect, it } from 'vitest'
import { InvalidTransitionError, TRANSITIONS, transition } from './state-machine'
import type { ConversationState } from '@/integrations/ai/prompts'

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
      'NEW', 'COLLECTING_INFO', 'AWAIT_PRICE_OFFER', 'AWAIT_PAYMENT',
      'AWAIT_FINAL_CONFIRMATION', 'AWAITING_APPOINTMENT', 'AWAIT_NPS_SCORE', 'COMPLETED',
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
})
