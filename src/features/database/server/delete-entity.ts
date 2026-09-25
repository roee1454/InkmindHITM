import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { DeleteEntityResult, DeleteImpactResult } from '../types'

const deleteTargetSchema = z.object({
  collection: z.enum(['customers', 'staff', 'appointments', 'conversations']),
  id: z.string().min(1),
})

export const getDeleteImpact = createServerFn({ method: 'GET' })
  .validator(deleteTargetSchema)
  .handler(async ({ data }): Promise<DeleteImpactResult> => {
    const { handleGetDeleteImpact } = await import('./delete-entity.server')
    return handleGetDeleteImpact(data)
  })

export const deleteEntity = createServerFn({ method: 'POST' })
  .validator(deleteTargetSchema)
  .handler(async ({ data }): Promise<DeleteEntityResult> => {
    const { handleDeleteEntity } = await import('./delete-entity.server')
    return handleDeleteEntity(data)
  })
