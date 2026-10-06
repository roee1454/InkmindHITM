import { createServerFn } from '@tanstack/react-start'
import type { PipelineData } from '../types'

export const listPipeline = createServerFn({ method: 'GET' }).handler(async (): Promise<PipelineData> => {
  const { requireAuth } = await import('@/features/settings/server/helpers.server')
  const { getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server')
  const { loadPipeline } = await import('./pipeline.server')
  const { staff } = await requireAuth()
  return loadPipeline(await getSuperuserClient(), { id: staff.id, role: staff.role }, new Date())
})
