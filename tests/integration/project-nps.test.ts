import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { stateAttribution } from '@/features/conversations/server/state-machine'
import type { BotToolsContext } from '@/integrations/ai/tools.server'
import { createConversation, createCustomer, hoursFromNow, superuserClient } from './helpers/pocketbase'

const addSystemNotification = vi.fn().mockResolvedValue(null)
vi.mock('@/features/notifications/server/notifications', () => ({ addSystemNotification: (...args: unknown[]) => addSystemNotification(...args) }))

const { buildBotTools } = await import('@/integrations/ai/tools.server')

// The end-of-project feedback answer (track-b B3.6) lands on the project the question was about,
// once per project — no more guessing "an appointment completed in the last 14 days".
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

async function awaitingFeedback(projectId: string) {
  const customer = await createCustomer(pb)
  const { conversation } = await createConversation(pb, customer.id)
  await pb.collection('conversations').update(conversation.id, { state: 'AWAIT_NPS_SCORE', active_project: projectId, ...stateAttribution('system', 'test_setup') })
  return { customer, conversationId: conversation.id }
}

async function finishedProject() {
  const customer = await createCustomer(pb)
  const session = await pb.collection('appointments').create({
    customer: customer.id,
    kind: 'session',
    start_time: hoursFromNow(-72),
    final_price: 900,
    ...statusChange('completed', 'staff', 'test'),
  })
  return session.project as string
}

async function answer(conversationId: string, customerId: string, score: number) {
  const tools = buildBotTools({
    su: pb,
    conversationId,
    customerId,
    runtimeConfig: { reviewLink: 'https://g.page/r/test' } as unknown as BotToolsContext['runtimeConfig'],
    conversationState: 'AWAIT_NPS_SCORE',
    conversationStatus: 'bot_active',
    staffCallReason: null,
  })
  const execute = tools.record_nps_score.execute
  return execute?.({ score }, { toolCallId: 'nps', messages: [] } as unknown as Parameters<NonNullable<typeof execute>>[1])
}

describe('end-of-project feedback', () => {
  it('records the score on the project and closes the conversation', async () => {
    const projectId = await finishedProject()
    const { customer, conversationId } = await awaitingFeedback(projectId)

    expect(await answer(conversationId, customer.id, 9)).toMatchObject({ status: 'success', segment: 'promoter' })

    expect((await pb.collection('projects').getOne(projectId)).nps_score).toBe(9)
    expect(await pb.collection('conversations').getOne(conversationId)).toMatchObject({ state: 'COMPLETED', active_project: '' })
  })

  it('keeps the first score of a project', async () => {
    const projectId = await finishedProject()
    await pb.collection('projects').update(projectId, { nps_score: 6 })
    const { customer, conversationId } = await awaitingFeedback(projectId)

    await answer(conversationId, customer.id, 10)

    expect((await pb.collection('projects').getOne(projectId)).nps_score).toBe(6)
  })

  it('tells staff the score when the conversation has no project, instead of losing it', async () => {
    const { customer, conversationId } = await awaitingFeedback('')
    addSystemNotification.mockClear()

    await answer(conversationId, customer.id, 8)

    expect(addSystemNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'התקבל ציון משוב בלי פרויקט' }))
  })
})
