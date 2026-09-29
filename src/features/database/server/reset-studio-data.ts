import { createServerFn } from '@tanstack/react-start'
import type { ResetStudioDataResult } from './reset-studio-data.server'

/** Development only; the server refuses anywhere else, whatever the client shows. */
export const resetStudio = createServerFn({ method: 'POST' }).handler(async (): Promise<ResetStudioDataResult> => {
  if (process.env.NODE_ENV !== 'development') throw new Error('פעולה זו זמינה רק בסביבת פיתוח.')
  const { requireAdmin } = await import('@/features/settings/server/helpers.server')
  const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
  const { resetStudioData } = await import('./reset-studio-data.server')
  await requireAdmin()
  return resetStudioData(await getSuperuserClient(), { drainOutbox: true })
})
