import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth, requireAdmin } from './helpers.server'

export interface ApiFaqEntry {
  id: string
  question: string
  answer: string
}

export const getFaqList = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiFaqEntry[]> => {
    await requireAuth()
    const su = await getSuperuserClient()
    const list = await su.collection('faq').getFullList({ sort: '-created' })
    return list.map((item) => ({
      id: item.id,
      question: (item.question as string) || '',
      answer: (item.answer as string) || '',
    }))
  },
)

const createFaqSchema = z.object({
  question: z.string().trim().min(1, 'שאלה חובה'),
  answer: z.string().trim().min(1, 'תשובה חובה'),
})

export const createFaq = createServerFn({ method: 'POST' })
  .validator(createFaqSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    const created = await su.collection('faq').create({
      question: data.question,
      answer: data.answer,
    })
    return { id: created.id, question: created.question, answer: created.answer }
  })

const updateFaqSchema = z.object({
  id: z.string(),
  question: z.string().trim().min(1, 'שאלה חובה'),
  answer: z.string().trim().min(1, 'תשובה חובה'),
})

export const updateFaq = createServerFn({ method: 'POST' })
  .validator(updateFaqSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    await su.collection('faq').update(data.id, {
      question: data.question,
      answer: data.answer,
    })
    return { ok: true }
  })

const deleteFaqSchema = z.object({
  id: z.string(),
})

export const deleteFaq = createServerFn({ method: 'POST' })
  .validator(deleteFaqSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    await su.collection('faq').delete(data.id)
    return { ok: true }
  })
