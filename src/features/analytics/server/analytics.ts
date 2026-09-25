import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { AnalyticsSummary } from '../types'

const analyticsInputSchema = z.object({
  timeRange: z.enum(['30d', 'this_month', 'last_month', 'all']).default('30d'),
})

export const getStudioAnalytics = createServerFn({ method: 'GET' })
  .validator((d: unknown) => analyticsInputSchema.parse(d ?? {}))
  .handler(async ({ data }): Promise<AnalyticsSummary> => {
    const { handleGetStudioAnalytics } = await import('./analytics-core.server')
    return handleGetStudioAnalytics({ data })
  })

