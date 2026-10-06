import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { runLifecycleTick } from './lifecycle-service'

declare global {
   
  var __lifecycleInterval: NodeJS.Timeout | null | undefined
}

const INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export function startLifecycleRunner(): void {
  if (process.env.DISABLE_LIFECYCLE_RUNNER === 'true' || process.env.ENABLE_LIFECYCLE_RUNNER === 'false') {
    console.info('[lifecycle-runner] Lifecycle runner is disabled via environment flag (DISABLE_LIFECYCLE_RUNNER=true).')
    return
  }

  if (globalThis.__lifecycleInterval) {
    return
  }

  console.info('[lifecycle-runner] Starting automated lifecycle background runner (15m interval)...')

  // Run initial tick after a brief 10-second startup delay
  setTimeout(async () => {
    try {
      const su = await getSuperuserClient()
      const res = await runLifecycleTick(su)
      if (res.total > 0) {
        console.info(`[lifecycle-runner] Initial tick enqueued/applied ${res.total} actions:`, res)
      }
    } catch (err) {
      console.error('[lifecycle-runner] Error during initial tick:', err)
    }
  }, 10_000)

  globalThis.__lifecycleInterval = setInterval(async () => {
    try {
      const su = await getSuperuserClient()
      const res = await runLifecycleTick(su)
      if (res.total > 0) {
        console.info(`[lifecycle-runner] Tick enqueued/applied ${res.total} actions:`, res)
      }
    } catch (err) {
      console.error('[lifecycle-runner] Error during periodic tick:', err)
    }
  }, INTERVAL_MS)
}

export function stopLifecycleRunner(): void {
  if (globalThis.__lifecycleInterval) {
    clearInterval(globalThis.__lifecycleInterval)
    globalThis.__lifecycleInterval = null
    console.info('[lifecycle-runner] Stopped lifecycle background runner.')
  }
}
