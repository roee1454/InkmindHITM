import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import type { Customer } from '../types'

export const getCustomers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Customer[]> => {
    await requireAuth()
    const su = await getSuperuserClient()

    const [customerRecords, appointmentRecords] = await Promise.all([
      su.collection('customers').getFullList({ sort: '-created' }),
      su.collection('appointments').getFullList().catch(() => []),
    ])

    const statsMap: Record<string, { visits: number; totalSpend: number }> = {}
    for (const appt of appointmentRecords) {
      const custId = (appt.customer as string) || (appt.customer_id as string)
      if (!custId) continue
      if (!statsMap[custId]) statsMap[custId] = { visits: 0, totalSpend: 0 }
      if (appt.status !== 'cancelled') {
        statsMap[custId].visits += 1
        statsMap[custId].totalSpend += Number(appt.price_max || appt.price_min || 0)
      }
    }

    return customerRecords.map((item) => {
      const stats = statsMap[item.id] || { visits: 0, totalSpend: 0 }
      return {
        id: item.id,
        name: (item.name as string) || null,
        phone: (item.phone as string) || null,
        email: (item.email as string) || null,
        source: (item.source as string) || null,
        isVip: Boolean(item.is_vip),
        chatId: (item.whatsapp_chat_id as string) || null,
        createdAt: item.created as string,
        updatedAt: item.updated as string,
        visits: stats.visits,
        totalSpend: stats.totalSpend,
      }
    })
  },
)

const createCustomerSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().trim().min(1, 'נא להזין מספר טלפון'),
  email: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  isVip: z.boolean().default(false),
})

export const createCustomer = createServerFn({ method: 'POST' })
  .validator(createCustomerSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()
    const studio = await su.collection('studios').getFirstListItem('').catch(() => null)
    const created = await su.collection('customers').create({
      studio: studio?.id || '',
      name: data.name || '',
      phone: data.phone,
      email: data.email || '',
      source: data.source || '',
      is_vip: data.isVip,
    })
    return { id: created.id }
  })

const updateCustomerSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  phone: z.string().trim().min(1, 'נא להזין מספר טלפון'),
  email: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  isVip: z.boolean().default(false),
})

export const updateCustomer = createServerFn({ method: 'POST' })
  .validator(updateCustomerSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()
    await su.collection('customers').update(data.id, {
      name: data.name || '',
      phone: data.phone,
      email: data.email || '',
      source: data.source || '',
      is_vip: data.isVip,
    })
    return { id: data.id }
  })

const deleteCustomerSchema = z.object({
  id: z.string(),
})

export const deleteCustomer = createServerFn({ method: 'POST' })
  .validator(deleteCustomerSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()
    await su.collection('customers').delete(data.id)
    return { ok: true }
  })
