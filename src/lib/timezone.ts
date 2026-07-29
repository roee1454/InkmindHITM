/**
 * Single-tenant studio timezone. The entire codebase does date math in the process-local
 * timezone (see src/lib/date-utils.ts — "local-timezone day math only"), which is only
 * correct while the process clock matches the studio's wall clock. On dev machines in
 * Israel that holds by accident; on Render's UTC containers it silently shifted every
 * bot-booked appointment by 2–3 hours (customer hears 12:00, calendar shows 15:00).
 * This module makes the assumption explicit and enforces it at boot.
 */
export const STUDIO_TIMEZONE = 'Asia/Jerusalem'

function currentZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Aligns the process timezone with the studio wall clock, throwing if it cannot.
 * Called from superuser.server.ts's module body (after its dotenv load), which every
 * server code path imports — so this effectively runs once per boot.
 *
 * Prefers self-healing over failing: on POSIX, assigning process.env.TZ reconfigures
 * V8's Date/Intl at runtime, so a missing TZ env var (e.g. a Render service created
 * without render.yaml's envVars block) gets corrected instead of quietly storing
 * wrong-by-3-hours appointments. Throwing is reserved for platforms where the
 * reassignment doesn't take — a hard boot failure beats corrupt bookings.
 */
export function ensureStudioTimezone(): void {
  if (currentZone() === STUDIO_TIMEZONE) return
  process.env.TZ = STUDIO_TIMEZONE
  if (currentZone() !== STUDIO_TIMEZONE) {
    throw new Error(
      `Process timezone is "${currentZone()}" and could not be reset to "${STUDIO_TIMEZONE}". ` +
        `Set TZ=${STUDIO_TIMEZONE} in the environment — appointment times are stored relative ` +
        `to the studio wall clock, and a mismatched process timezone corrupts every booking.`,
    )
  }
}
