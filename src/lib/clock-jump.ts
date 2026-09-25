/**
 * React Query judges freshness with Date.now(). Data fetched while the wall clock was moved
 * forward carries a future `dataUpdatedAt` and counts as fresh until real time catches up — four
 * days, in the incident this exists for (a customer list kept showing a deleted customer).
 * performance.now() is monotonic and ignores wall-clock changes, so comparing how far each
 * advanced between two samples reveals a jump in either direction.
 */
export interface ClockSample {
  wallMs: number
  monotonicMs: number
}

export const CLOCK_JUMP_THRESHOLD_MS = 60_000

/** How much further (or less far) the wall clock moved than real elapsed time. */
export function clockDriftMs(previous: ClockSample, current: ClockSample): number {
  return current.wallMs - previous.wallMs - (current.monotonicMs - previous.monotonicMs)
}

export function isClockJump(previous: ClockSample, current: ClockSample, thresholdMs = CLOCK_JUMP_THRESHOLD_MS): boolean {
  return Math.abs(clockDriftMs(previous, current)) > thresholdMs
}

/** A timestamp later than "now" can only have been written while the clock was ahead. */
export function isFromTheFuture(timestampMs: number, nowMs: number, toleranceMs = CLOCK_JUMP_THRESHOLD_MS): boolean {
  return timestampMs - nowMs > toleranceMs
}
