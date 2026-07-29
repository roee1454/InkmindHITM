/**
 * Process-level debounce scheduler. Coordinates delayed execution of bot turns
 * when multiple media items are sent consecutively by a customer.
 */
class DebounceScheduler {
  private timers = new Map<string, NodeJS.Timeout>()
  private callbacks = new Map<string, () => void>()

  schedule(key: string, delayMs: number, fn: () => void): void {
    this.cancel(key)
    this.callbacks.set(key, fn)
    const timer = setTimeout(() => {
      this.timers.delete(key)
      this.callbacks.delete(key)
      fn()
    }, delayMs)
    this.timers.set(key, timer)
  }

  cancelAndRunNow(key: string, fn: () => void): void {
    const pendingFn = this.callbacks.get(key)
    this.cancel(key)
    if (pendingFn) {
      pendingFn()
    } else {
      fn()
    }
  }

  cancel(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
    this.callbacks.delete(key)
  }
}

const globalForScheduler = globalThis as unknown as {
  botTurnScheduler?: DebounceScheduler
}

export const botTurnScheduler = globalForScheduler.botTurnScheduler ?? new DebounceScheduler()

if (process.env.NODE_ENV !== 'production') {
  globalForScheduler.botTurnScheduler = botTurnScheduler
}
