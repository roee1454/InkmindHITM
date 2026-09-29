import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ResetDataResult } from './reset-data.server'

/** Development only; the server refuses anywhere else, whatever the client shows. */
export const resetAppData = createServerFn({ method: 'POST' })
  .validator(z.object({ scope: z.enum(['work', 'business', 'everything']) }))
  .handler(async ({ data }): Promise<ResetDataResult> => {
    if (process.env.NODE_ENV !== 'development') throw new Error('פעולה זו זמינה רק בסביבת פיתוח.')
    const { requireAdmin } = await import('@/features/settings/server/helpers.server')
    const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
    const { resetData } = await import('./reset-data.server')
    await requireAdmin()
    return resetData(await getSuperuserClient(), data.scope, { drainOutbox: true })
  })
