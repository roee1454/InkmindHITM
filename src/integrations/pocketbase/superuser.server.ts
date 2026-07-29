import PocketBase from 'pocketbase'
import dotenv from 'dotenv'
import path from 'path'

import fs from 'fs'
import { ensureStudioTimezone } from '@/lib/timezone'

// Load .env variables on the server in production/preview mode,
// since Vite only automatically injects them during development dev runs.
if (process.env.NODE_ENV !== 'development') {
  let dir = process.cwd()
  let envPath: string | null = null
  while (dir) {
    const file = path.join(dir, '.env')
    if (fs.existsSync(file)) {
      envPath = file
      break
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  if (envPath) {
    dotenv.config({ path: envPath })
  }
}

// Every server code path imports this module, so this runs once per boot — after the
// dotenv load above, so a TZ from .env has already been applied when we check it.
// Appointment math is process-local-timezone throughout; see src/lib/timezone.ts.
ensureStudioTimezone()

// Stranded-bot-turn recovery (FLOW-7), hooked here for the same reason as the timezone
// check: this is the one module every server path imports, so it effectively runs at
// boot regardless of which request arrives first. The domain logic lives in the
// conversations feature; the dynamic import both defers it past boot-critical work and
// avoids a static import cycle (agent.server → … → this module). Guarded on globalThis
// so dev-mode module reloads don't schedule repeat scans.
const globalForRecovery = globalThis as { __strandedRecoveryScheduled?: boolean }
// Skipped under vitest: unit tests import this module transitively, and the delayed
// scan would try to auth against a live PocketBase after the test run ends.
if (!globalForRecovery.__strandedRecoveryScheduled && !process.env.VITEST) {
  globalForRecovery.__strandedRecoveryScheduled = true
  setTimeout(() => {
    import('@/features/conversations/server/recover-stranded')
      .then((m) => m.recoverStrandedBotTurns())
      .catch((err) => console.error('[recover-stranded] boot scan failed:', err))
  }, 5000)
}

/**
 * Per-request server client. Loads auth state from the incoming Cookie header so
 * server functions/routes see the same session as the browser. Call
 * `persistSessionCookie()` (src/lib/session.server.ts) after any auth-mutating call.
 */
export function createRequestClient(cookieHeader: string | undefined | null) {
  const client = new PocketBase(process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090')
  client.autoCancellation(false)
  if (cookieHeader) client.authStore.loadFromCookie(cookieHeader)
  return client
}

/**
 * Privileged client authenticated as the Pocketbase superuser. Only for server
 * functions that must bypass collection API rules — e.g. creating `staff` records,
 * which are superuser-only by design (see pocketbase/schema/build_schema.py).
 * Never expose this client or its token to the browser.
 *
 * This lives in a `.server.ts`-suffixed file (split out from `client.ts`, which also
 * exports the client-reachable `getBrowserClient`) so the framework's build-time
 * convention guarantees this module — and the `PB_SUPERUSER_EMAIL`/`PASSWORD` env reads
 * inside it — can never end up in a client bundle, regardless of who imports it later.
 *
 * Caching strategy:
 * - In DEVELOPMENT: no caching — each call creates a fresh auth. This avoids stale
 *   token errors after DB resets (which change PocketBase's signing key, invalidating
 *   all existing tokens even if they haven't expired by JWT standards). Auth to
 *   localhost takes <5ms so the overhead is negligible.
 * - In PRODUCTION: module-level singleton to avoid re-authing on every hot request.
 *   If the token is expired (`authStore.isValid === false`), it re-authenticates once.
 */

async function createSuperuserClient(): Promise<PocketBase> {
  const client = new PocketBase(process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090')
  client.autoCancellation(false)
  await client.collection('_superusers').authWithPassword(
    process.env.PB_SUPERUSER_EMAIL ?? '',
    process.env.PB_SUPERUSER_PASSWORD ?? '',
  )
  return client
}

// Production-only cache
let superuserClientPromise: Promise<PocketBase> | null = null

export async function getSuperuserClient(): Promise<PocketBase> {
  // In development, always create a fresh authenticated client.
  // This prevents stale-token errors after DB resets, which change PocketBase's
  // signing key and invalidate all in-memory tokens regardless of their JWT expiry.
  if (process.env.NODE_ENV === 'development') {
    return createSuperuserClient().catch(() => {
      throw new Error(
        'PocketBase superuser auth failed — is PocketBase running? Check PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in .env',
      )
    })
  }

  // Production: use cached client, refresh if expired
  if (!superuserClientPromise) {
    superuserClientPromise = createSuperuserClient().catch((err) => {
      superuserClientPromise = null
      throw err
    })
  }

  try {
    const client = await superuserClientPromise
    if (!client.authStore.isValid) {
      superuserClientPromise = null
      return getSuperuserClient()
    }
    return client
  } catch {
    superuserClientPromise = null
    throw new Error(
      'PocketBase superuser auth failed — check PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD in .env',
    )
  }
}
