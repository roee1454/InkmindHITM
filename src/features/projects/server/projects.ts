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

export const getProjectDetails = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { handleGetProjectDetails } = await import('./project-details.server')
    return handleGetProjectDetails(data.projectId)
  })

const amount = z.number().positive().max(1_000_000).nullable()

export const updateProjectDetails = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      projectId: z.string().min(1),
      title: z.string().trim().min(1, 'יש לתת לפרויקט שם.').max(200),
      quoteMin: amount,
      quoteMax: amount,
      estimatedSessions: z.number().int().min(1).max(50).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { handleUpdateProjectDetails } = await import('./project-details.server')
    await handleUpdateProjectDetails(data)
    return { ok: true }
  })

export const moveAppointmentToProject = createServerFn({ method: 'POST' })
  .validator(z.object({ appointmentId: z.string().min(1), target: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { handleMoveAppointment } = await import('./project-details.server')
    return handleMoveAppointment(data)
  })

export const listOpenProjects = createServerFn({ method: 'GET' })
  .validator(z.object({ customerId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { handleListOpenProjects } = await import('./customer-projects.server')
    return handleListOpenProjects(data.customerId)
  })
