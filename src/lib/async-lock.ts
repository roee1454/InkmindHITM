/**
 * In-process, in-memory mutex keyed by an arbitrary string, implemented as a per-key chained
 * promise queue. Operations queued under the same key run strictly one after another, in call
 * order; different keys run fully in parallel. Ported from a validated prior project's
 * `chat-lock.ts` (there: serializing per-WhatsApp-chat session read-modify-writes across a bot
 * turn, a staff resolution, and a manual CRM edit that would otherwise clobber each other).
 *
 * Only correct for a single Node process — if this app is ever horizontally scaled across
 * multiple instances, this in-memory `Map` stops being a shared lock and the same
 * serialization would need to move to something external (DB advisory lock, Redis, etc.).
 */
class KeyedLock {
  private readonly chains = new Map<string, Promise<unknown>>()

  async runExclusive<T>(key: string, fn: () => Promise<T>, timeoutMs = 30_000): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve()

    let timer: NodeJS.Timeout | null = null
    const timeoutPromise = timeoutMs > 0
      ? new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`KeyedLock timeout after ${timeoutMs}ms for key "${key}"`))
          }, timeoutMs)
        })
      : null

    const execute = async () => {
      try {
        if (timeoutPromise) {
          return await Promise.race([fn(), timeoutPromise])
        }
        return await fn()
      } finally {
        if (timer) clearTimeout(timer)
      }
    }

    // Swallow the previous run's rejection here only for sequencing — the original caller of
    // that run still sees its own error through its own `await`.
    const run = prev.catch(() => {}).then(execute)
    this.chains.set(key, run)
    try {
      return await run
    } finally {
      // Only clear if we're still the tail, so a newer queued op isn't dropped.
      if (this.chains.get(key) === run) this.chains.delete(key)
    }
  }
}

const globalForLocks = globalThis as unknown as {
  conversationLock?: KeyedLock
  bookingLock?: KeyedLock
  phoneLock?: KeyedLock
  closeOutLock?: KeyedLock
}

/** Serializes bot turns and appointment holds for the same conversation. */
export const conversationLock = globalForLocks.conversationLock ?? new KeyedLock()

/** Serializes the check-availability-then-create-hold sequence per staff member, so two
 *  concurrent bookings for the same artist/slot can't both pass the overlap check before
 *  either writes. Different staff members book fully in parallel. */
export const bookingLock = globalForLocks.bookingLock ?? new KeyedLock()

/** Serializes customer and conversation creation per phone number to prevent duplicate customer/conversation records on concurrent webhooks. */
export const phoneLock = globalForLocks.phoneLock ?? new KeyedLock()

/** Serializes closing a session per appointment, so a double-submitted close-out can't record its payments twice. */
export const closeOutLock = globalForLocks.closeOutLock ?? new KeyedLock()

if (process.env.NODE_ENV !== 'production') {
  globalForLocks.conversationLock = conversationLock
  globalForLocks.bookingLock = bookingLock
  globalForLocks.phoneLock = phoneLock
  globalForLocks.closeOutLock = closeOutLock
}

