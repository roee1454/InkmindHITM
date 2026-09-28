import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { CustomerOverview } from '../types'

export const getCustomerOverview = createServerFn({ method: 'GET' })
  .validator(z.object({ customerId: z.string().min(1) }))
  .handler(async ({ data }): Promise<CustomerOverview> => {
    const { requireAuth } = await import('@/features/settings/server/helpers.server')
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const { loadCustomerOverview } = await import('./customer-overview.server')
    const { staff } = await requireAuth()
    return loadCustomerOverview(await getSuperuserClient(), { id: staff.id, role: staff.role }, data.customerId, new Date())
  })
