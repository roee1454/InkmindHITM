import { syncStudioConfigToDb } from '../src/config/studio/sync.server'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('[studio-sync] Synchronizing studio.config.ts with database...')
  const maxAttempts = 10
  const delayMs = 2000

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await syncStudioConfigToDb()
      console.log(`[studio-sync] Successfully synchronized! Settings record ID: ${result.recordId}`)
      process.exit(0)
    } catch (err) {
      if (attempt < maxAttempts) {
        console.warn(
          `[studio-sync] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delayMs / 1000}s... (${err instanceof Error ? err.message : String(err)})`,
        )
        await sleep(delayMs)
      } else {
        console.error('[studio-sync] Synchronization failed after maximum attempts:', err)
        process.exit(1)
      }
    }
  }
}

main()
