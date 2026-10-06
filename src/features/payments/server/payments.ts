import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ProjectFinance } from '../types'

const paymentMethod = z.enum(['bit', 'paybox', 'cash', 'credit_card', 'bank_transfer', 'other'])

export const getProjectFinance = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }): Promise<ProjectFinance> => {
    const { requireAuth } = await import('@/features/settings/server/helpers.server')
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const { loadProjectFinance } = await import('./project-finance.server')
    await requireAuth()
    return loadProjectFinance(await getSuperuserClient(), data.projectId)
  })

export const closeSession = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      appointmentId: z.string().min(1),
      finalPrice: z.number().positive().nullable(),
      chargeWaived: z.boolean(),
      payments: z.array(z.object({ method: paymentMethod, amount: z.number().positive() })).max(10),
      note: z.string().max(500).optional(),
      completesProject: z.boolean(),
    }),
  )
  .handler(async ({ data }): Promise<ProjectFinance> => {
    const { handleCloseSession } = await import('./close-session.server')
    return handleCloseSession(data)
  })
