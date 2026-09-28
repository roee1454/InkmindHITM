import { HEBREW_DAYS_SHORT, minutesToTime } from '@/lib/date-utils'
import { formatIls } from '@/features/payments/utils/labels'

/** "ג׳ 5.10 · 14:00" */
export function formatShortSlot(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${HEBREW_DAYS_SHORT[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1} · ${minutesToTime(date.getHours() * 60 + date.getMinutes())}`
}

/** A quote as "₪4,500–6,000", a single price, or null when there's no quote. */
/** Left-to-right isolate: keeps a price range reading low→high inside a Hebrew sentence. */
const LTR_ISOLATE = '⁦'
const POP_ISOLATE = '⁩'

/** "~4", isolated left-to-right: the tilde is bidi-neutral, so bare in Hebrew text it lands after the number ("4~"). */
export function formatApprox(n: number): string {
  return `${LTR_ISOLATE}~${n}${POP_ISOLATE}`
}

export function formatQuote(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null
  if (min === null || max === null || min === max) return formatIls((min ?? max) as number)
  // Without the isolate, an RTL line renders "₪1,800–2,400" as "2,400–₪1,800": the dash is
  // bidi-neutral, so the two numbers swap places around it.
  return `${LTR_ISOLATE}${formatIls(min)}–${max.toLocaleString('he-IL')}${POP_ISOLATE}`
}
