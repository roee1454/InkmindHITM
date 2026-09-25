import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { LOST_REASONS } from '../types'

/** Project milestones the stage can't infer. Returns nothing: callers refetch what they show. */

export const markProjectLost = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().min(1), reason: z.enum(LOST_REASONS), note: z.string().max(1000).optional() }))
  .handler(async ({ data }) => {
    const { handleMarkProjectLost } = await import('./project-milestones.server')
    await handleMarkProjectLost(data)
    return { ok: true }
  })

export const reopenProject = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { handleReopenProject } = await import('./project-milestones.server')
    await handleReopenProject(data)
    return { ok: true }
  })

export const completeProject = createServerFn({ method: 'POST' })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { handleCompleteProject } = await import('./project-milestones.server')
    await handleCompleteProject(data)
    return { ok: true }
  })
