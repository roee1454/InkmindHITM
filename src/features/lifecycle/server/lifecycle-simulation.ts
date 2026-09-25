import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAdmin } from '@/features/settings/server/helpers.server'
import { runLifecycleTick } from './lifecycle-service'
import type { LifecycleTickResult } from './lifecycle-service'

const HOUR_MS = 60 * 60 * 1000

const simulateSchema = z.object({
  hoursAhead: z.number().min(0).max(24 * 60),
  dryRun: z.boolean(),
})

/**
 * Dev-only: runs one lifecycle tick as if it were `hoursAhead` hours from now. A dry run (the
 * default in the UI) sends and writes nothing and returns the plan. This is the way to test
 * reminders and expiries — never move the machine's clock: everything written while it is ahead
 * (PocketBase autodates, React Query's fetch times, JWTs) keeps the future timestamp afterwards.
 */
export const simulateLifecycleTick = createServerFn({ method: 'POST' })
  .validator(simulateSchema)
  .handler(async ({ data }): Promise<LifecycleTickResult> => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('פעולה זו זמינה רק בסביבת פיתוח.')
    }
    await requireAdmin()
    const su = await getSuperuserClient()
    const simulatedNow = new Date(Date.now() + data.hoursAhead * HOUR_MS)
    return runLifecycleTick(su, simulatedNow, { dryRun: data.dryRun, plan: [] })
  })
