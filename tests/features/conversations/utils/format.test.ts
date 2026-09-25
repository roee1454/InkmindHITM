import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatDuration,
  formatPriceRange,
  formatWindowRemaining,
  getDateKey,
  formatMessageDateSeparator,
} from '@/features/conversations/utils/format'

describe('formatWindowRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-17T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('treats null as expired — no window was ever opened', () => {
    expect(formatWindowRemaining(null)).toEqual({
      label: 'חלון 24 השעות פג',
      shortLabel: 'חלון פג',
      status: 'expired',
    })
  })

  it('treats an invalid date string as expired rather than throwing', () => {
    expect(formatWindowRemaining('not-a-date')).toEqual({
      label: 'חלון 24 השעות פג',
      shortLabel: 'חלון פג',
      status: 'expired',
    })
  })

  it('treats a past timestamp as expired', () => {
    expect(formatWindowRemaining('2026-08-16T12:00:00.000Z')).toEqual({
      label: 'חלון 24 השעות פג',
      shortLabel: 'חלון פג',
      status: 'expired',
    })
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

describe('formatDuration', () => {
  it('formats 45 minutes as "45 דק׳"', () => {
    expect(formatDuration(45)).toBe('45 דק׳')
  })

  it('formats 30 minutes as "חצי שעה"', () => {
    expect(formatDuration(30)).toBe('חצי שעה')
  })

  it('formats 60 minutes as "שעה"', () => {
    expect(formatDuration(60)).toBe('שעה')
  })

  it('formats 90 minutes as "שעה וחצי"', () => {
    expect(formatDuration(90)).toBe('שעה וחצי')
  })

  it('formats 120 minutes as "שעתיים"', () => {
    expect(formatDuration(120)).toBe('שעתיים')
  })

  it('formats 180 minutes as "3 שעות"', () => {
    expect(formatDuration(180)).toBe('3 שעות')
  })

  it('formats 105 minutes as "שעה ו-45 דק׳"', () => {
    expect(formatDuration(105)).toBe('שעה ו-45 דק׳')
  })

  it('formats 0 or null as "—"', () => {
    expect(formatDuration(0)).toBe('—')
  })
})

describe('formatPriceRange', () => {
  it('returns "ייקבע בפגישה" for 0/0 or null/null', () => {
    expect(formatPriceRange(0, 0)).toBe('ייקבע בפגישה')
    expect(formatPriceRange(null, null)).toBe('ייקבע בפגישה')
    expect(formatPriceRange(0, null)).toBe('ייקבע בפגישה')
    expect(formatPriceRange(null, 0)).toBe('ייקבע בפגישה')
  })

  it('formats single price when min equals max', () => {
    expect(formatPriceRange(500, 500)).toBe('₪500')
  })

  it('formats price range when min does not equal max', () => {
    expect(formatPriceRange(800, 1000)).toBe('₪800–1,000')
  })
})

describe('getDateKey', () => {
  it('returns empty string for null or invalid dates', () => {
    expect(getDateKey(null)).toBe('')
    expect(getDateKey(undefined)).toBe('')
    expect(getDateKey('not-a-date')).toBe('')
  })

  it('returns YYYY-MM-DD for valid date ISO string', () => {
    expect(getDateKey('2026-09-18T10:00:00.000Z')).toBe('2026-09-18')
    expect(getDateKey('2026-01-05T20:30:00.000Z')).toBe('2026-01-05')
  })
})

describe('formatMessageDateSeparator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-18T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string for null or invalid date', () => {
    expect(formatMessageDateSeparator(null)).toBe('')
    expect(formatMessageDateSeparator(undefined)).toBe('')
    expect(formatMessageDateSeparator('invalid')).toBe('')
  })

  it('returns "היום" for messages from today', () => {
    expect(formatMessageDateSeparator('2026-09-18T08:30:00.000Z')).toBe('היום')
    expect(formatMessageDateSeparator('2026-09-18T11:59:00.000Z')).toBe('היום')
  })

  it('returns "אתמול" for messages from yesterday', () => {
    expect(formatMessageDateSeparator('2026-09-17T20:00:00.000Z')).toBe('אתמול')
  })

  it('returns day of week and date for earlier dates this year', () => {
    const result = formatMessageDateSeparator('2026-09-15T10:00:00.000Z')
    expect(result).toContain('ספטמבר')
    expect(result).toContain('15')
  })

  it('returns date with year for previous years', () => {
    const result = formatMessageDateSeparator('2025-11-20T10:00:00.000Z')
    expect(result).toContain('2025')
    expect(result).toContain('נובמבר')
    expect(result).toContain('20')
  })
})

