/**
 * Regression guard for FLOW-1: appointment date math is process-local-timezone
 * throughout the codebase, which silently broke on Render's UTC containers —
 * a slot agreed as 12:00 with the customer was stored as 12:00Z and rendered
 * as 15:00 in the dashboard and Google Calendar.
 *
 * Dynamic imports throughout: static imports are hoisted above the process.env.TZ
 * assignments, and the whole point is to control the timezone before module code runs.
 */
import { describe, expect, it } from 'vitest'

describe('ensureStudioTimezone', () => {
  it('self-heals a UTC process (the Render case) instead of storing shifted bookings', async () => {
    process.env.TZ = 'UTC'
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC')

    const { ensureStudioTimezone, STUDIO_TIMEZONE } = await import('./timezone')
    ensureStudioTimezone()

    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(STUDIO_TIMEZONE)
  })

  it('is a no-op when the process already runs on the studio wall clock', async () => {
    const { ensureStudioTimezone, STUDIO_TIMEZONE } = await import('./timezone')
    process.env.TZ = STUDIO_TIMEZONE
    expect(() => ensureStudioTimezone()).not.toThrow()
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(STUDIO_TIMEZONE)
  })

  it('serializes studio wall-clock slots to the correct UTC instant', async () => {
    const { ensureStudioTimezone } = await import('./timezone')
    ensureStudioTimezone()

    // 12:00 in Jerusalem during IDT (July, UTC+3) is 09:00Z. Under the pre-fix UTC
    // process this produced 12:00Z — the exact 3-hour shift customers would have seen.
    expect(new Date(2026, 6, 26, 12, 0).toISOString()).toBe('2026-07-26T09:00:00.000Z')
    // ...and during IST (January, UTC+2): 10:00Z. Catches DST-handling regressions.
    expect(new Date(2026, 0, 26, 12, 0).toISOString()).toBe('2026-01-26T10:00:00.000Z')
  })
})
