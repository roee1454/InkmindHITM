import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatWindowRemaining } from './format'

describe('formatWindowRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-17T12:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('treats null as expired — no window was ever opened', () => {
    expect(formatWindowRemaining(null)).toEqual({ label: 'חלון 24 השעות פג', shortLabel: 'חלון פג', status: 'expired' })
  })

  it('treats an invalid date string as expired rather than throwing', () => {
    expect(formatWindowRemaining('not-a-date')).toEqual({ label: 'חלון 24 השעות פג', shortLabel: 'חלון פג', status: 'expired' })
  })

  it('treats a past timestamp as expired', () => {
    expect(formatWindowRemaining('2026-08-16T12:00:00.000Z')).toEqual({ label: 'חלון 24 השעות פג', shortLabel: 'חלון פג', status: 'expired' })
  })

  it('reports "open" (green) with 12+ hours remaining', () => {
    const result = formatWindowRemaining('2026-08-18T02:00:00.000Z') // +14h
    expect(result.status).toBe('open')
    expect(result.label).toContain('14')
    expect(result.shortLabel).toContain('14')
  })

  it('reports "closing-soon" (amber) under 12 hours remaining', () => {
    const result = formatWindowRemaining('2026-08-17T20:00:00.000Z') // +8h
    expect(result.status).toBe('closing-soon')
    expect(result.label).toContain('8')
    expect(result.shortLabel).toContain('8')
  })

  it('switches to a minutes-based label under 1 hour remaining', () => {
    const result = formatWindowRemaining('2026-08-17T12:30:00.000Z') // +30min
    expect(result.status).toBe('closing-soon')
    expect(result.label).toContain('30')
    expect(result.label).toContain('דקות')
    expect(result.shortLabel).toContain('30')
  })
})
