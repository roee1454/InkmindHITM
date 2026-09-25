import { HEBREW_DAYS_SHORT, minutesToTime } from '@/lib/date-utils'
import { formatIls } from '@/features/payments/utils/labels'

/** "ג׳ 5.10 · 14:00" */
export function formatShortSlot(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${HEBREW_DAYS_SHORT[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1} · ${minutesToTime(date.getHours() * 60 + date.getMinutes())}`
}

/** A quote as "₪4,500–6,000", a single price, or null when there's no quote. */
export function formatQuote(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null
  if (min === null || max === null || min === max) return formatIls((min ?? max) as number)
  return `${formatIls(min)}–${max.toLocaleString('he-IL')}`
}
