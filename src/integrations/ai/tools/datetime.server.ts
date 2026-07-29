/**
 * Deterministic Hebrew relative-date resolution (FLOW-4). The model used to do date
 * arithmetic itself against the temporal-context block — a silent failure mode, because
 * a wrong date looks exactly like a right one all the way to the calendar. This tool
 * makes resolution a pure function: unambiguous expressions resolve to one date,
 * genuinely ambiguous ones ("סופ״ש", "שבוע הבא") come back `ambiguous` with candidates
 * so the model asks the customer instead of guessing.
 *
 * Conventions (documented in every relevant return so the model can relay them):
 * - bare weekday ("ראשון") = nearest upcoming occurrence, never today.
 * - "X הבא" = the occurrence in the NEXT calendar week (Sunday-start, matching the
 *   temporal block); when that differs from the nearest occurrence, the note says so
 *   and tells the model to confirm with the customer.
 * - passed numeric date ("15.3" in July) = next year, with a note.
 */
import { z } from 'zod'
import type { ToolFactoryContext } from './types'
import { toYmd, addDays } from '@/lib/date-utils'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export interface ResolvedDate {
  status: 'resolved'
  date: string // YYYY-MM-DD, for tool calls
  dayName: string
  spoken: string // "ראשון, 26.7" — how to say it to the customer (LANG-4)
  note?: string
}
export interface AmbiguousDate {
  status: 'ambiguous'
  message: string
  candidates?: Array<{ date: string; dayName: string; spoken: string }>
}
export interface UnrecognizedDate {
  status: 'unrecognized'
  message: string
}
export type DateResolution = ResolvedDate | AmbiguousDate | UnrecognizedDate

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function describe(d: Date): { date: string; dayName: string; spoken: string } {
  const dayName = DAY_NAMES[d.getDay()] ?? ''
  return { date: toYmd(d), dayName, spoken: `${dayName}, ${d.getDate()}.${d.getMonth() + 1}` }
}

function resolved(d: Date, note?: string): ResolvedDate {
  return { status: 'resolved', ...describe(d), ...(note ? { note } : {}) }
}

/** Strips niqqud-less prefixes ("ב", "ל") from a token when what remains is a known word. */
function normalize(raw: string): string {
  return raw
    .replace(/["'׳״]/g, '') // סופ"ש → סופש
    .replace(/[?!,]/g, ' ') // NOT '.' — dots are date separators (26.7)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '') // a sentence-final dot ("מחר.") isn't part of the expression
}

export function resolveHebrewDateExpression(rawExpression: string, now = new Date()): DateResolution {
  const today = startOfDay(now)
  const expr = normalize(rawExpression)

  if (!expr) return { status: 'unrecognized', message: 'ביטוי ריק — שאל את הלקוח לאיזה יום הוא מתכוון.' }

  // --- fixed relative words ---
  if (/^(היום|עכשיו)$/.test(expr)) return resolved(today)
  if (/^(מחר|למחר|בּ?מחר)$/.test(expr)) return resolved(addDays(today, 1))
  if (/^מחרתיים$/.test(expr)) return resolved(addDays(today, 2))

  // --- "בעוד / עוד X" offsets ---
  const offset = expr.match(/^(?:ב?עוד\s+)(.+)$/)
  if (offset?.[1]) {
    const rest = offset[1]
    if (/^יום$/.test(rest)) return resolved(addDays(today, 1))
    if (/^יומיים$/.test(rest)) return resolved(addDays(today, 2))
    if (/^שבוע$/.test(rest)) return resolved(addDays(today, 7))
    if (/^שבועיים$/.test(rest)) return resolved(addDays(today, 14))
    if (/^חודש$/.test(rest)) return resolved(addDays(today, 30), 'חודש חושב כ-30 יום — כדאי לאשר את התאריך המדויק מול הלקוח.')
    const nDays = rest.match(/^(\d{1,2})\s+ימים$/)
    if (nDays?.[1]) return resolved(addDays(today, Number(nDays[1])))
    const nWeeks = rest.match(/^(\d{1,2})\s+שבועות$/)
    if (nWeeks?.[1]) return resolved(addDays(today, Number(nWeeks[1]) * 7))
  }

  // --- weekend ---
  if (/^(סופש|סוף השבוע|סוף שבוע|בסופש)$/.test(expr)) {
    const friday = addDays(today, ((5 - today.getDay() + 7) % 7) || 7)
    const saturday = addDays(friday, 1)
    return {
      status: 'ambiguous',
      message: 'סופ"ש יכול להיות שישי או שבת — שאל את הלקוח איזה יום מתאים לו.',
      candidates: [describe(friday), describe(saturday)],
    }
  }

  // --- week ranges: real ranges, not dates ---
  if (/^(השבוע|שבוע הבא|בשבוע הבא)$/.test(expr)) {
    const isNext = expr.includes('הבא')
    const weekStart = addDays(today, -today.getDay() + (isNext ? 7 : 0))
    return {
      status: 'ambiguous',
      message: `זה טווח של שבוע (${toYmd(weekStart)} עד ${toYmd(addDays(weekStart, 6))}), לא יום ספציפי — שאל את הלקוח איזה יום בשבוע מתאים לו, או הצע ימים פנויים מתוך היומן.`,
    }
  }

  // --- vague ---
  if (/^(בקרוב|מתישהו|בהמשך|לא יודע|נראה)$/.test(expr)) {
    return { status: 'unrecognized', message: 'ביטוי עמום מדי — שאל את הלקוח לאיזה יום או תאריך הוא מתכוון.' }
  }

  // --- weekday names, with optional יום/ב prefix and הבא/הקרוב suffix ---
  const weekdayMatch = expr.match(/^(?:ב?יום\s+)?ב?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)(?:\s+(הבא|הקרוב))?$/)
  if (weekdayMatch?.[1]) {
    const target = DAY_NAMES.indexOf(weekdayMatch[1])
    const modifier = weekdayMatch[2]
    const daysUntilNearest = ((target - today.getDay() + 7) % 7) || 7 // never today
    const nearest = addDays(today, daysUntilNearest)

    if (modifier === 'הבא') {
      // Next-calendar-week convention (Sunday-start week, like the temporal block).
      const nextWeekOccurrence = addDays(today, -today.getDay() + 7 + target)
      if (toYmd(nextWeekOccurrence) === toYmd(nearest)) return resolved(nearest)
      return resolved(
        nextWeekOccurrence,
        `"${weekdayMatch[1]} הבא" פורש כ${DAY_NAMES[target]} של השבוע הבא. אם הלקוח התכוון ל${DAY_NAMES[target]} הקרוב (${describe(nearest).spoken}) — אשר איתו לפני שממשיכים.`,
      )
    }

    const sameDayNote = today.getDay() === target
      ? `היום הוא יום ${DAY_NAMES[target]} — פורש כ${DAY_NAMES[target]} הבא. אם הלקוח מתכוון להיום, אשר איתו במפורש.`
      : undefined
    return resolved(nearest, sameDayNote)
  }

  // --- explicit numeric dates: 26.7 / 26/7/2026 / 2026-07-26 ---
  const iso = expr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return resolved(d)
  }
  const numeric = expr.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = Number(numeric[2])
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { status: 'unrecognized', message: 'התאריך המספרי לא תקין (פורמט מקובל: יום.חודש, למשל 26.7) — בדוק עם הלקוח.' }
    }
    let year = numeric[3] ? Number(numeric[3]) : today.getFullYear()
    if (year < 100) year += 2000
    let d = new Date(year, month - 1, day)
    if (!numeric[3] && d < today) {
      d = new Date(year + 1, month - 1, day)
      return resolved(d, 'התאריך הזה כבר עבר השנה, אז פורש כשנה הבאה — כנראה לא מה שהלקוח התכוון. אשר איתו.')
    }
    return resolved(d)
  }

  return {
    status: 'unrecognized',
    message: 'לא זוהה ביטוי תאריך. שאל את הלקוח לאיזה יום או תאריך הוא מתכוון (למשל: "ראשון", "מחר", "26.7").',
  }
}

export function buildDateTools(ctx: ToolFactoryContext) {
  const { botTool } = ctx

  return {
    resolve_date: botTool(
      'ממיר ביטוי תאריך בעברית ("מחר", "ראשון הבא", "עוד שבועיים", "26.7") לתאריך מדויק. חובה להשתמש בו לכל ביטוי תאריך שאינו טריוויאלי במקום לחשב לבד — חישוב ידני של תאריכים הוא מקור ידוע לטעויות שקטות.',
      z.object({
        expression: z.string().min(1).describe('ביטוי התאריך כפי שהלקוח כתב אותו (למשל: "ראשון הבא", "סופ״ש", "26.7")'),
      }),
      async ({ expression }) => {
        const result = resolveHebrewDateExpression(expression)
        if (result.status === 'resolved') {
          return {
            status: 'success',
            message: `התאריך: ${result.date} (${result.spoken}).${result.note ? ` שים לב: ${result.note}` : ''} ללקוח תגיד "${result.spoken}", לכלים תעביר ${result.date}.`,
            data: result,
          }
        }
        return { status: result.status, message: result.message, data: result }
      },
    ),
  }
}
