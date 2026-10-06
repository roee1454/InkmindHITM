import { beforeAll, describe, expect, it } from 'vitest'
import type PocketBase from 'pocketbase'
import { parseIntegrityViolation } from '@/features/database/utils/integrity-codes'
import { stateAttribution, transition } from '@/features/conversations/server/state-machine'
import { createConversation, createCustomer, superuserClient } from './helpers/pocketbase'

// pb_hooks/conversation-state.pb.js: the dialogue state has one writer. A change without
// attribution is rejected whoever writes it, and every change is logged in state_transitions.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

async function conversationTransitions(conversationId: string) {
  return pb.collection('state_transitions').getFullList({
    filter: pb.filter("entity = 'conversations' && entity_id = {:id}", { id: conversationId }),
    sort: 'created,id',
  })
}

async function newConversation(customerId: string) {
  return (await createConversation(pb, customerId)).conversation
}

async function rejection(run: () => Promise<unknown>) {
  try {
    await run()
    return null
  } catch (err) {
    return err as { status?: number; response?: { message?: string } }
  }
}

describe('conversation state', () => {
  it('rejects a state change that bypasses the state machine, and changes nothing', async () => {
    const customer = await createCustomer(pb)
    const conversation = await newConversation(customer.id)

    const err = await rejection(() => pb.collection('conversations').update(conversation.id, { state: 'AWAIT_PAYMENT' }))

    expect(err?.status).toBe(400)
    expect(parseIntegrityViolation(err?.response?.message)).toBe('conversation_state_unattributed')
    expect((await pb.collection('conversations').getOne(conversation.id)).state).toBe('NEW')
  })

  it('logs every move made through transition(), with its actor and reason', async () => {
    const customer = await createCustomer(pb)
    const conversation = await newConversation(customer.id)

    await transition(pb, conversation.id, 'WANTS_TO_BOOK', { actor: 'bot', reason: 'start_booking' })
    await transition(pb, conversation.id, 'COLLECTING_INFO', { actor: 'bot', reason: 'choose_booking_track' })

    expect((await conversationTransitions(conversation.id)).map((t) => [t.from, t.to, t.actor, t.reason])).toEqual([
      ['NEW', 'WANTS_TO_BOOK', 'bot', 'start_booking'],
      ['WANTS_TO_BOOK', 'COLLECTING_INFO', 'bot', 'choose_booking_track'],
    ])
    expect(await pb.collection('conversations').getOne(conversation.id)).toMatchObject({ state_actor: '', state_reason: '' })
    // audit_log is only for rejected moves and staff overrides now.
    expect(await pb.collection('audit_log').getFullList({ filter: pb.filter('conversation = {:c}', { c: conversation.id }) })).toHaveLength(0)
  })

  it('lets other fields change without attribution', async () => {
    const customer = await createCustomer(pb)
    const conversation = await newConversation(customer.id)

    await expect(pb.collection('conversations').update(conversation.id, { status: 'staff_handling' })).resolves.toMatchObject({ status: 'staff_handling' })
  })

  it('creates a first-contact conversation in NEW freely, and anything else only with attribution', async () => {
    const customer = await createCustomer(pb)
    const err = await rejection(() => pb.collection('conversations').create({ customer: customer.id, status: 'bot_active', state: 'COLLECTING_INFO' }))
    expect(parseIntegrityViolation(err?.response?.message)).toBe('conversation_state_unattributed')

    const created = await pb.collection('conversations').create({ customer: customer.id, status: 'bot_active', state: 'COLLECTING_INFO', ...stateAttribution('staff', 'template_started_conversation') })
    expect((await conversationTransitions(created.id)).map((t) => [t.from, t.to, t.actor])).toEqual([['', 'COLLECTING_INFO', 'staff']])
  })
})
