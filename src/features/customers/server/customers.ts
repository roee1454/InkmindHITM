import { formatDatabaseError } from '@/lib/pocketbase-error'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import { toCanonicalE164Phone } from '@/lib/phone'
import { loadProjectPolicy } from '@/features/settings/server/project-policy'
import { projectStageOf } from '@/features/projects/utils/labels'
import { deriveCustomerLifecycle } from '../utils/lifecycle'
import type { LifecycleProject } from '../utils/lifecycle'
import type { Customer } from '../types'

export const getCustomers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Customer[]> => {
    const session = await requireAuth()
    const su = await getSuperuserClient()
    const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'

    const [allCustomers, allAppointments, conversations, projects, policy] = await Promise.all([
      su.collection('customers').getFullList({ sort: '-created' }),
      su.collection('appointments').getFullList().catch(() => []),
      !isAdmin
        ? su.collection('conversations').getFullList({ fields: 'id,customer,assigned_staff' })
        : Promise.resolve([]),
      su.collection('projects').getFullList({ fields: 'id,customer,stage,created' }).catch(() => []),
      loadProjectPolicy(su),
    ])

    // Lifecycle is a fact about the customer, so it reads every appointment, not only this artist's.
    const sessionDatesByProject = new Map<string, string[]>()
    for (const appt of allAppointments) {
      if (appt.kind !== 'session' || appt.status !== 'completed' || !appt.project) continue
      const dates = sessionDatesByProject.get(appt.project as string) ?? []
      dates.push(appt.start_time as string)
      sessionDatesByProject.set(appt.project as string, dates)
    }
    const projectsByCustomer = new Map<string, LifecycleProject[]>()
    for (const project of projects) {
      const list = projectsByCustomer.get(project.customer as string) ?? []
      list.push({ stage: projectStageOf(project.stage), createdAt: project.created as string, sessionDates: sessionDatesByProject.get(project.id) ?? [] })
      projectsByCustomer.set(project.customer as string, list)
    }
    const now = new Date()

    const appointmentRecords = isAdmin
      ? allAppointments
      : allAppointments.filter((a) => a.staff === session.staff.id)

    let customerRecords = allCustomers
    if (!isAdmin) {
      const allowedCustomerIds = new Set<string>()
      for (const conv of conversations) {
        if (conv.assigned_staff === session.staff.id && conv.customer) {
          allowedCustomerIds.add(conv.customer as string)
        }
      }
      for (const appt of appointmentRecords) {
        if (appt.customer) allowedCustomerIds.add(appt.customer as string)
      }
      customerRecords = allCustomers.filter((c) => allowedCustomerIds.has(c.id))
    }

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
        lifecycle: deriveCustomerLifecycle(projectsByCustomer.get(item.id) ?? [], now, policy.dormantAfterMonths),
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
