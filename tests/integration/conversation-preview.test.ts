import { beforeAll, describe, expect, it } from 'vitest'
import type PocketBase from 'pocketbase'
import { createConversation, createCustomer, superuserClient } from './helpers/pocketbase'

// pb_hooks/conversation-preview.pb.js: every new message writes the inbox line onto its conversation.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

async function addMessage(conversationId: string, fields: Record<string, unknown>) {
  return pb.collection('messages').create({
    conversation: conversationId,
    whatsapp_message_id: `wamid.${crypto.randomUUID()}`,
    direction: 'outbound',
    sender_type: 'ai_bot',
    type: 'text',
    body: '',
    timestamp: new Date().toISOString(),
    ...fields,
  })
}

async function line(conversationId: string) {
  const conversation = await pb.collection('conversations').getOne(conversationId)
  return [conversation.last_message_preview, conversation.last_message_sender]
}

describe('conversation preview', () => {
  it('shows the last message and who sent it', async () => {
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id, { messageBodies: ['היי, רציתי לשאול על קעקוע'] })
    expect(await line(conversation.id)).toEqual(['היי, רציתי לשאול על קעקוע', 'customer'])

    await addMessage(conversation.id, { body: 'היי!  אפשר\nתמונת השראה?' })
    expect(await line(conversation.id)).toEqual(['היי! אפשר תמונת השראה?', 'ai_bot'])
  })

  it('names media without text, and skips instructions to the bot and reactions', async () => {
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id)

    await addMessage(conversation.id, { direction: 'inbound', sender_type: 'customer', type: 'image' })
    expect(await line(conversation.id)).toEqual(['תמונה', 'customer'])

    await addMessage(conversation.id, { sender_type: 'staff', body: 'תעבירי לשלב המקדמה', whatsapp_message_id: 'internal_staff_1' })
    await addMessage(conversation.id, { direction: 'inbound', sender_type: 'customer', type: 'reaction', body: '👍' })
    expect(await line(conversation.id)).toEqual(['תמונה', 'customer'])
  })

  it('cuts a long message', async () => {
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id)
    await addMessage(conversation.id, { body: 'א'.repeat(300) })
    const [preview] = await line(conversation.id)
    expect(preview).toHaveLength(140)
    expect(preview.endsWith('…')).toBe(true)
  })
})
