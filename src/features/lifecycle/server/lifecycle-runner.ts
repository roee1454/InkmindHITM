import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { runLifecycleTick } from './lifecycle-service'

declare global {
  // eslint-disable-next-line no-var
  var __lifecycleInterval: NodeJS.Timeout | null | undefined
}

const INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

export function startLifecycleRunner(): void {
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
        console.info(`[lifecycle-runner] Initial tick processed ${res.total} actions:`, res)
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
        console.info(`[lifecycle-runner] Tick processed ${res.total} actions:`, res)
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
