import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuth } from '@/features/settings/server/helpers.server'
import type { ApiAppointment, ApiGoogleConnection } from '../types'
import {
  getGoogleCalendarConnectionsHandler,
  handleDisconnectStaffGoogleCalendar,
  getAppointmentsHandler,
  createAppointmentHandler,
  handleUpdateAppointment,
  retrySyncAppointmentToGoogleHandler,
  sendPriceQuoteToCustomerHandler,
  confirmSlotHandler,
} from './appointments.server'

export const getGoogleCalendarConnections = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiGoogleConnection[]> => {
    return getGoogleCalendarConnectionsHandler()
  },
)

const disconnectSchema = z.object({
  staffId: z.string(),
})

export const disconnectStaffGoogleCalendar = createServerFn({ method: 'POST' })
  .validator(disconnectSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth()
    return handleDisconnectStaffGoogleCalendar(data.staffId, session)
  })

export const getAppointments = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiAppointment[]> => {
    return getAppointmentsHandler()
  },
)

export const createAppointmentSchema = z.object({
  projectId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  chatId: z.string().nullable().optional(),
  leadName: z.string().optional(),
  leadPhone: z.string().optional(),
  date: z.string().min(1, 'תאריך נדרש'),
  timeSlot: z.string().min(1, 'שעה נדרשת'),
  staffId: z.string().nullable().optional(),
  type: z.enum(['tattoo', 'sketch']).default('tattoo'),
  durationMinutes: z.number().default(120),
  tattooDescription: z.string().optional(),
  priceMinIls: z.number().nullable().optional(),
  priceMaxIls: z.number().nullable().optional(),
  depositAmount: z.number().nullable().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).default('pending'),
  depositPaid: z.boolean().default(false),
  notes: z.string().optional(),
  allowException: z.boolean().default(false),
})

export const createAppointment = createServerFn({ method: 'POST' })
  .validator(createAppointmentSchema)
  .handler(async ({ data }) => {
    return createAppointmentHandler(data)
  })

export const updateAppointmentSchema = z.object({
  id: z.string(),
  customerId: z.string().nullable().optional(),
  chatId: z.string().nullable().optional(),
  leadName: z.string().optional(),
  leadPhone: z.string().optional(),
  date: z.string().optional(),
  timeSlot: z.string().optional(),
  staffId: z.string().nullable().optional(),
  type: z.enum(['tattoo', 'sketch']).optional(),
  durationMinutes: z.number().optional(),
  tattooDescription: z.string().optional(),
  priceMinIls: z.number().nullable().optional(),
  priceMaxIls: z.number().nullable().optional(),
  depositAmount: z.number().nullable().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  depositPaid: z.boolean().optional(),
  notes: z.string().optional(),
  allowException: z.boolean().optional(),
  healthDeclarationSigned: z.boolean().optional(),
  healthDeclarationDate: z.string().nullable().optional(),
  healthDeclarationFileUrl: z.string().nullable().optional(),
})

export const updateAppointment = createServerFn({ method: 'POST' })
  .validator(updateAppointmentSchema)
  .handler(async ({ data }) => {
    await requireAuth()
    return handleUpdateAppointment(data)
    const session = await requireAuth()
    return handleUpdateAppointment(data, undefined, session)
  })

export const deleteAppointmentSchema = z.object({
  id: z.string(),
})

export const deleteAppointment = createServerFn({ method: 'POST' })
  .validator(deleteAppointmentSchema)
  .handler(async ({ data }) => {
    const { handleDeleteEntity } = await import('@/features/database/server/delete-entity.server')
    const { describeDeleteFailure } = await import('@/features/database/utils/delete-messages')
    const result = await handleDeleteEntity({ collection: 'appointments', id: data.id })
    if (result.status !== 'deleted') throw describeDeleteFailure('appointments', result)
    return { ok: true }
  })

export const retrySyncAppointmentToGoogle = createServerFn({ method: 'POST' })
  .validator(z.object({ appointmentId: z.string() }))
  .handler(async ({ data }) => {
    return retrySyncAppointmentToGoogleHandler(data.appointmentId)
  })

export const sendPriceQuoteSchema = z.object({
  appointmentId: z.string(),
  priceMinIls: z.number().min(0),
  priceMaxIls: z.number().min(0),
  depositAmount: z.number().min(0),
  durationMinutes: z.number().min(15).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
})

export const sendPriceQuoteToCustomer = createServerFn({ method: 'POST' })
  .validator(sendPriceQuoteSchema)
  .handler(async ({ data }) => {
    return sendPriceQuoteToCustomerHandler(data)
  })

export const confirmSlotSchema = z.object({
  appointmentId: z.string(),
})

export const confirmSlot = createServerFn({ method: 'POST' })
  .validator(confirmSlotSchema)
  .handler(async ({ data }) => {
    return confirmSlotHandler(data.appointmentId)
  })
