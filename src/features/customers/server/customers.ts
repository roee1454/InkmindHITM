import { formatDatabaseError } from '@/lib/pocketbase-error'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import { toCanonicalE164Phone } from '@/lib/phone'
import { loadCustomerLifecycles } from './customer-lifecycle.server'
import type { Customer } from '../types'

export const getCustomers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Customer[]> => {
    const session = await requireAuth()
    const su = await getSuperuserClient()
    const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'

    const [allCustomers, lifecycleOf] = await Promise.all([su.collection('customers').getFullList({ sort: '-updated' }), loadCustomerLifecycles(su)])

    // An artist sees the customers they talk to or have an appointment with.
    let customerRecords = allCustomers
    if (!isAdmin) {
      const [conversations, appointments] = await Promise.all([
        su.collection('conversations').getFullList({ fields: 'customer', filter: `assigned_staff = "${session.staff.id}"` }),
        su.collection('appointments').getFullList({ fields: 'customer', filter: `staff = "${session.staff.id}"` }),
      ])
      const allowed = new Set([...conversations, ...appointments].map((r) => r.customer as string).filter(Boolean))
      customerRecords = allCustomers.filter((c) => allowed.has(c.id))
    }

    return customerRecords.map((item) => {
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
        lifecycle: lifecycleOf(item.id),
        healthDeclarationSigned: Boolean(item.health_declaration_signed),
        healthDeclarationDate: (item.health_declaration_date as string) || null,
        healthDeclarationUrl: (item.health_declaration_url as string) || null,
        allergies: (item.allergies as string) || null,
        medicalNotes: (item.medical_notes as string) || null,
        healthDeclarationAnswers:
          (item.health_declaration_answers as Record<string, string | number | boolean | null | string[]>) || null,
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
  healthDeclarationSigned: z.boolean().optional(),
  healthDeclarationDate: z.string().nullable().optional(),
  healthDeclarationUrl: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  medicalNotes: z.string().nullable().optional(),
  healthDeclarationAnswers: z.record(z.string(), z.any()).nullable().optional(),
})

export const createCustomer = createServerFn({ method: 'POST' })
  .validator(createCustomerSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()
    try {
      const studio = await su.collection('studios').getFirstListItem('').catch(() => null)
      const created = await su.collection('customers').create({
        studio: studio?.id || '',
        name: data.name || '',
        phone: toCanonicalE164Phone(data.phone),
        email: data.email || '',
        source: data.source || '',
        is_vip: data.isVip,
        health_declaration_signed: Boolean(data.healthDeclarationSigned),
        health_declaration_date: data.healthDeclarationDate || '',
        health_declaration_url: data.healthDeclarationUrl || '',
        allergies: data.allergies || '',
        medical_notes: data.medicalNotes || '',
        health_declaration_answers: data.healthDeclarationAnswers || {},
      })
      return { id: created.id }
    } catch (err) {
      throw new Error(formatDatabaseError(err, 'יצירת הלקוח נכשלה.'))
    }
  })

const updateCustomerSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  phone: z.string().trim().min(1, 'נא להזין מספר טלפון'),
  email: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  isVip: z.boolean().default(false),
  healthDeclarationSigned: z.boolean().optional(),
  healthDeclarationDate: z.string().nullable().optional(),
  healthDeclarationUrl: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  medicalNotes: z.string().nullable().optional(),
  healthDeclarationAnswers: z.record(z.string(), z.any()).nullable().optional(),
})

export const updateCustomer = createServerFn({ method: 'POST' })
  .validator(updateCustomerSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    const su = await getSuperuserClient()
    try {
      const updateBody: Record<string, unknown> = {
        name: data.name || '',
        phone: toCanonicalE164Phone(data.phone),
        email: data.email || '',
        source: data.source || '',
        is_vip: data.isVip,
      }
      if (data.healthDeclarationSigned !== undefined) updateBody.health_declaration_signed = data.healthDeclarationSigned
      if (data.healthDeclarationDate !== undefined) updateBody.health_declaration_date = data.healthDeclarationDate
      if (data.healthDeclarationUrl !== undefined) updateBody.health_declaration_url = data.healthDeclarationUrl
      if (data.allergies !== undefined) updateBody.allergies = data.allergies
      if (data.medicalNotes !== undefined) updateBody.medical_notes = data.medicalNotes
      if (data.healthDeclarationAnswers !== undefined) updateBody.health_declaration_answers = data.healthDeclarationAnswers

      await su.collection('customers').update(data.id, updateBody)
      return { id: data.id }
    } catch (err) {
      throw new Error(formatDatabaseError(err, 'עדכון הלקוח נכשל.'))
    }
  })
