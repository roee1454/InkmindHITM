/**
 * Deterministic Hebrew relative-date & time resolution engine (FLOW-4).
 *
 * Resolves natural Hebrew date and time expressions spoken by Israeli tattoo studio clients
 * into concrete ISO dates (YYYY-MM-DD), timeSlots (HH:MM), and timeOfDay periods.
 * Pure deterministic algorithm — prevents LLM hallucination of appointment dates and times.
 * Zero dependency on AI/PocketBase/WhatsApp: this is a standalone Hebrew date parser reusable
 * anywhere in the app, not just from the `resolve_date` AI tool (resolve-date.server.ts) that
 * wraps it.
 */
import { toYmd, addDays } from '@/lib/date-utils'
import { DAY_NAMES, HEBREW_MONTHS, HEBREW_WORD_NUMBERS } from './hebrew-lexicon'
import { extractTimeDetails, normalize, type TimeOfDay } from './time-extraction'

export interface ResolvedDate {
  status: 'resolved'
  date: string // YYYY-MM-DD, for tool calls
  dayName: string
  spoken: string // "ראשון, 26.7" — how to say it to the customer (LANG-4)
  note?: string
  timeOfDay?: TimeOfDay
  timeSlot?: string // "14:00" (HH:MM 24-hour format)
}

export interface AmbiguousDate {
  status: 'ambiguous'
  message: string
  candidates?: Array<{ date: string; dayName: string; spoken: string; timeSlot?: string }>
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

function resolved(
  d: Date,
  note?: string,
  timeOfDay?: TimeOfDay,
  timeSlot?: string,
): ResolvedDate {
  return {
    status: 'resolved',
    ...describe(d),
    ...(note ? { note } : {}),
    ...(timeOfDay ? { timeOfDay } : {}),
    ...(timeSlot ? { timeSlot } : {}),
  }
}

export function resolveHebrewDateExpression(rawExpression: string, now = new Date()): DateResolution {
  const today = startOfDay(now)

  // 1. Extract exact timeSlot (14:00) and time-of-day period first
  const { cleanedExpr, timeSlot, timeOfDay, timeLabel } = extractTimeDetails(rawExpression)
  const expr = normalize(cleanedExpr)

  const wrapResult = (res: DateResolution): DateResolution => {
    if (res.status !== 'resolved') return res
    let note = res.note
    if (timeSlot) {
      const slotNote = `הלקוח ביקש שעה ${timeSlot}.`
      note = note ? `${note} ${slotNote}` : slotNote
    } else if (timeLabel) {
      const timeNote = `הלקוח ביקש מועד ב${timeLabel}.`
      note = note ? `${note} ${timeNote}` : timeNote
    }
    return {
      ...res,
      ...(note ? { note } : {}),
      ...(timeOfDay ? { timeOfDay } : {}),
      ...(timeSlot ? { timeSlot } : {}),
    }
  }

  if (!expr) {
    if (timeSlot) {
      // If customer ONLY specified an hour without a date ("ב-14:00"), resolve to today with note or ask
      return wrapResult(resolved(today, 'הלקוח ציין שעה ללא תאריך — פורש כהיום. ודא תאריך מול הלקוח.'))
    }
    return { status: 'unrecognized', message: 'ביטוי ריק — שאל את הלקוח לאיזה יום הוא מתכוון.' }
  }

  // --- Fixed relative words ---
  if (/^(היום|עכשיו)$/.test(expr)) return wrapResult(resolved(today))
  if (/^(מחר|למחר|בּ?מחר)$/.test(expr)) return wrapResult(resolved(addDays(today, 1)))
  if (/^מחרתיים$/.test(expr)) return wrapResult(resolved(addDays(today, 2)))

  // --- Extended relative offsets & fractions ---
  if (/^עוד\s+שבוע\s+וחצי$/.test(expr)) return wrapResult(resolved(addDays(today, 10)))
  if (/^עוד\s+חודש\s+וחצי$/.test(expr)) return wrapResult(resolved(addDays(today, 45)))
  if (/^עוד\s+(?:יום[- ]יומיים|יומיים[- ]שלושה)$/.test(expr)) {
    return {
      status: 'ambiguous',
      message: 'הלקוח ביקש בעוד יום-יומיים — שאל איזה יום מביניהם מועדף.',
      candidates: [describe(addDays(today, 1)), describe(addDays(today, 2))],
    }
  }
  if (/^עוד\s+שבוע[- ]שבועיים$/.test(expr)) {
    return {
      status: 'ambiguous',
      message: 'הלקוח ביקש בעוד שבוע-שבועיים — שאל איזה יום מביניהם מועדף.',
      candidates: [describe(addDays(today, 7)), describe(addDays(today, 14))],
    }
  }

  // --- "בעוד / עוד X" offsets ---
  const offset = expr.match(/^(?:ב?עוד\s+)(.+)$/)
  if (offset?.[1]) {
    const rest = offset[1]
    if (/^יום$/.test(rest)) return wrapResult(resolved(addDays(today, 1)))
    if (/^יומיים$/.test(rest)) return wrapResult(resolved(addDays(today, 2)))
    if (/^שלושה\s+ימים$/.test(rest)) return wrapResult(resolved(addDays(today, 3)))
    if (/^ארבעה\s+ימים$/.test(rest)) return wrapResult(resolved(addDays(today, 4)))
    if (/^חמישה\s+ימים$/.test(rest)) return wrapResult(resolved(addDays(today, 5)))
    if (/^שבוע$/.test(rest)) return wrapResult(resolved(addDays(today, 7)))
    if (/^שבועיים$/.test(rest)) return wrapResult(resolved(addDays(today, 14)))
    if (/^שלושה\s+שבועות$/.test(rest)) return wrapResult(resolved(addDays(today, 21)))
    if (/^חודש$/.test(rest)) return wrapResult(resolved(addDays(today, 30), 'חודש חושב כ-30 יום — כדאי לאשר את התאריך המדויק מול הלקוח.'))
    const nDays = rest.match(/^(\d{1,2})\s+ימים$/)
    if (nDays?.[1]) return wrapResult(resolved(addDays(today, Number(nDays[1]))))
    const nWeeks = rest.match(/^(\d{1,2})\s+שבועות$/)
    if (nWeeks?.[1]) return wrapResult(resolved(addDays(today, Number(nWeeks[1]) * 7)))
  }

  // --- Weekend ---
  if (/^(סופש|סוף השבוע|סוף שבוע|בסופש)$/.test(expr)) {
    const friday = addDays(today, ((5 - today.getDay() + 7) % 7) || 7)
    const saturday = addDays(friday, 1)
    return {
      status: 'ambiguous',
      message: 'סופ"ש יכול להיות שישי או שבת — שאל את הלקוח איזה יום מתאים לו.',
      candidates: [describe(friday), describe(saturday)],
    }
  }

  // --- Week ranges: general ranges ---
  if (/^(השבוע|שבוע הבא|בשבוע הבא)$/.test(expr)) {
    const isNext = expr.includes('הבא')
    const weekStart = addDays(today, -today.getDay() + (isNext ? 7 : 0))
    return {
      status: 'ambiguous',
      message: `זה טווח של שבוע (${toYmd(weekStart)} עד ${toYmd(addDays(weekStart, 6))}), לא יום ספציפי — שאל את הלקוח איזה יום בשבוע מתאים לו, או הצע ימים פנויים מתוך היומן.`,
    }
  }

  // --- Part of Month / Approximations ---
  if (/^(?:ב?תחילת|ב?אמצע|ב?סוף)\s+(?:החודש|חודש\s+הבא|שבוע\s+הבא|השבוע)/.test(expr)) {
    if (expr.includes('תחילת חודש הבא')) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      return {
        status: 'ambiguous',
        message: `תחילת חודש הבא (${nextMonth.getMonth() + 1}/${nextMonth.getFullYear()}) — שאל את הלקוח איזה יום בתחילת החודש מתאים לו.`,
        candidates: [describe(nextMonth), describe(addDays(nextMonth, 1)), describe(addDays(nextMonth, 2))],
      }
    }
    if (expr.includes('סוף חודש הבא')) {
      const lastDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)
      const target = addDays(lastDayNextMonth, -3)
      return {
        status: 'ambiguous',
        message: `סוף חודש הבא — שאל את הלקוח לאיזה תאריך בסוף החודש הוא מתכוון.`,
        candidates: [describe(target), describe(lastDayNextMonth)],
      }
    }
    if (expr.includes('תחילת השבוע') || expr.includes('תחילת שבוע הבא')) {
      const isNext = expr.includes('הבא')
      const sunday = addDays(today, -today.getDay() + (isNext ? 7 : 0))
      return {
        status: 'ambiguous',
        message: 'תחילת שבוע היא ימים ראשון או שני — שאל איזה יום מתאים ללקוח.',
        candidates: [describe(sunday), describe(addDays(sunday, 1))],
      }
    }
    if (expr.includes('אמצע השבוע')) {
      const tuesday = addDays(today, -today.getDay() + 2)
      return {
        status: 'ambiguous',
        message: 'אמצע השבוע כולל ימים שלישי או רביעי — שאל איזה יום מתאים ללקוח.',
        candidates: [describe(tuesday), describe(addDays(tuesday, 1))],
      }
    }
  }

  // --- Israeli Holidays ---
  if (/^(?:אחרי\s+החגים|לאחר\s+החגים)$/.test(expr)) {
    // "אחרי החגים" refers to post-Sukkot / Simchat Torah period (early October 2026: Sunday 2026-10-11)
    const afterHolidaysDate = new Date(2026, 9, 11) // 2026-10-11
    return wrapResult(resolved(afterHolidaysDate, 'פורש כתחילת השבוע שלאחר סוכות ושמחת תורה ("אחרי החגים"). אשר מול הלקוח.'))
  }
  if (/^(?:ב?פסח|חג\s+פסח)$/.test(expr)) {
    return {
      status: 'ambiguous',
      message: 'חג הפסח הוא טווח ימים — שאל את הלקוח לאיזה תאריך או יום בחול המועד הוא מתכוון.',
    }
  }
  if (/^(?:ב?סוכות|חג\s+סוכות)$/.test(expr)) {
    return {
      status: 'ambiguous',
      message: 'חג הסוכות הוא טווח ימים — שאל את הלקוח לאיזה יום בסוכות או בחול המועד הוא מתכוון.',
    }
  }

  // --- Multiple options with "או" (e.g. "ראשון או שני", "שני או שלישי הבא") ---
  const orWeekdayMatch = expr.match(/^(?:ב?יום\s+)?ב?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s+או\s+(?:ב?יום\s+)?ב?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)(?:\s+(הבא|הקרוב))?$/)
  if (orWeekdayMatch && orWeekdayMatch[1] && orWeekdayMatch[2]) {
    const d1Name = orWeekdayMatch[1]
    const d2Name = orWeekdayMatch[2]
    const modifier = orWeekdayMatch[3]
    const t1 = DAY_NAMES.indexOf(d1Name)
    const t2 = DAY_NAMES.indexOf(d2Name)
    let d1: Date
    let d2: Date

    if (modifier === 'הבא') {
      d1 = addDays(today, -today.getDay() + 7 + t1)
      d2 = addDays(today, -today.getDay() + 7 + t2)
    } else {
      d1 = addDays(today, ((t1 - today.getDay() + 7) % 7) || 7)
      d2 = addDays(today, ((t2 - today.getDay() + 7) % 7) || 7)
    }

    return {
      status: 'ambiguous',
      message: `הלקוח הציע שתי אפשרויות (${d1Name} או ${d2Name}) — שאל איזה יום מביניהם מועדף עליו.`,
      candidates: [describe(d1), describe(d2)],
    }
  }

  // --- Day of week + Numeric date combined: e.g. "יום שלישי ה-28.7", "שלישי 28.7", "חמישי 23.7" ---
  const weekdayWithDateMatch = expr.match(/^(?:ב?יום\s+)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s+(?:ה-?|ב-?|ל-?)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/)
    || expr.match(/^(?:ה-?|ב-?|ל-?)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\s+(?:ב?יום\s+)?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)$/)
  if (weekdayWithDateMatch) {
    const isFirstFormat = DAY_NAMES.includes(weekdayWithDateMatch[1] || '')
    const weekday = isFirstFormat ? weekdayWithDateMatch[1]! : weekdayWithDateMatch[4]!
    const day = Number(isFirstFormat ? weekdayWithDateMatch[2] : weekdayWithDateMatch[1])
    const month = Number(isFirstFormat ? weekdayWithDateMatch[3] : weekdayWithDateMatch[2])
    let year = Number(isFirstFormat ? weekdayWithDateMatch[4] : weekdayWithDateMatch[3]) || today.getFullYear()
    if (year < 100) year += 2000

    let d = new Date(year, month - 1, day)
    let note: string | undefined
    if (d < today && !weekdayWithDateMatch[4]) {
      d = new Date(year + 1, month - 1, day)
      note = 'התאריך כבר חלף השנה, אז פורש כשנה הבאה. אשר עם הלקוח.'
    }

    const expectedDay = DAY_NAMES.indexOf(weekday)
    if (expectedDay !== d.getDay()) {
      const actualDayName = DAY_NAMES[d.getDay()]
      note = `שים לב: ${day}.${month} הוא יום ${actualDayName} ולא יום ${weekday}. אשר מול הלקוח.`
    }

    return wrapResult(resolved(d, note))
  }

  // --- "Next week" prefix with weekday: e.g. "שבוע הבא ביום שלישי", "שבוע הבא שלישי", "בשבוע הבא בחמישי" ---
  const nextWeekPrefixMatch = expr.match(/^(?:ב?שבוע\s+הבא)\s+(?:ב?יום\s+)?ב?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)$/)
  if (nextWeekPrefixMatch && nextWeekPrefixMatch[1]) {
    const target = DAY_NAMES.indexOf(nextWeekPrefixMatch[1])
    const nextWeekOccurrence = addDays(today, -today.getDay() + 7 + target)
    return wrapResult(resolved(nextWeekOccurrence))
  }

  // --- Hebrew Month Names: e.g. "15 באוגוסט", "15 לאוגוסט", "ב-15 לאוגוסט", "10 ביולי", "הראשון באוגוסט" ---
  const hebrewMonthMatch = expr.match(/^(?:ה-?|ב-?|ל-?)?(\d{1,2}|ראשון|הראשון|שני|השני|שלישי|השלישי|רביעי|עשירי|העשירי|עשרים|העשרים|שלושים|השלושים)\s+(?:ב|ל|ה)?(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)(?:\s+(\d{4}))?$/)
  if (hebrewMonthMatch && hebrewMonthMatch[1] && hebrewMonthMatch[2]) {
    const rawDay = hebrewMonthMatch[1]
    const rawMonth = hebrewMonthMatch[2]
    const day = HEBREW_WORD_NUMBERS[rawDay] || Number(rawDay)
    const month = HEBREW_MONTHS[rawMonth]

    if (month && day >= 1 && day <= 31) {
      const year = hebrewMonthMatch[3] ? Number(hebrewMonthMatch[3]) : today.getFullYear()
      let d = new Date(year, month - 1, day)
      let note: string | undefined

      if (!hebrewMonthMatch[3] && d < today) {
        d = new Date(year + 1, month - 1, day)
        note = 'התאריך כבר חלף השנה, אז פורש כשנה הבאה. אשר עם הלקוח.'
      }
      return wrapResult(resolved(d, note))
    }
  }

  // --- Part of specific month: e.g. "אמצע אוגוסט", "תחילת ספטמבר", "סוף יולי" ---
  const partOfMonthMatch = expr.match(/^(?:ב?תחילת|ב?אמצע|ב?סוף)\s+(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)$/)
  if (partOfMonthMatch && partOfMonthMatch[1]) {
    const month = HEBREW_MONTHS[partOfMonthMatch[1]]
    if (month) {
      let year = today.getFullYear()
      if (month < today.getMonth() + 1) year += 1
      let day = 15
      if (expr.includes('תחילת')) day = 2
      if (expr.includes('סוף')) day = 27
      const d = new Date(year, month - 1, day)
      return wrapResult(resolved(d, `פורש כסביבות ה-${day} לחודש ${partOfMonthMatch[1]}. אשר את המועד המדויק עם הלקוח.`))
    }
  }

  // --- Vague expressions ---
  if (/^(בקרוב|מתישהו|בהמשך|לא יודע|נראה)$/.test(expr)) {
    return { status: 'unrecognized', message: 'ביטוי עמום מדי — שאל את הלקוח לאיזה יום או תאריך הוא מתכוון.' }
  }

  // --- Weekday names, with optional יום/ב prefix and הבא/הקרוב suffix ---
  const weekdayMatch = expr.match(/^(?:ב?יום\s+)?ב?(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)(?:\s+(הבא|הקרוב))?$/)
  if (weekdayMatch?.[1]) {
    const target = DAY_NAMES.indexOf(weekdayMatch[1])
    const modifier = weekdayMatch[2]
    const daysUntilNearest = ((target - today.getDay() + 7) % 7) || 7 // never today
    const nearest = addDays(today, daysUntilNearest)

    if (modifier === 'הבא') {
      // Next-calendar-week convention (Sunday-start week, like the temporal block).
      const nextWeekOccurrence = addDays(today, -today.getDay() + 7 + target)
      if (toYmd(nextWeekOccurrence) === toYmd(nearest)) return wrapResult(resolved(nearest))
      return wrapResult(
        resolved(
          nextWeekOccurrence,
          `"${weekdayMatch[1]} הבא" פורש כ${DAY_NAMES[target]} של השבוע הבא. אם הלקוח התכוון ל${DAY_NAMES[target]} הקרוב (${describe(nearest).spoken}) — אשר איתו לפני שממשיכים.`,
        ),
      )
    }

    const sameDayNote = today.getDay() === target
      ? `היום הוא יום ${DAY_NAMES[target]} — פורש כ${DAY_NAMES[target]} הבא. אם הלקוח מתכוון להיום, אשר איתו במפורש.`
      : undefined
    return wrapResult(resolved(nearest, sameDayNote))
  }

  // --- Explicit numeric dates: 26.7 / 26/7/2026 / 2026-07-26 ---
  const iso = expr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso && iso[1] && iso[2] && iso[3]) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return wrapResult(resolved(d))
  }
  const numeric = expr.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/)
  if (numeric && numeric[1] && numeric[2]) {
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
      return wrapResult(resolved(d, 'התאריך הזה כבר עבר השנה, אז פורש כשנה הבאה — כנראה לא מה שהלקוח התכוון. אשר איתו.'))
    }
    return wrapResult(resolved(d))
  }

  return {
    status: 'unrecognized',
    message: 'לא זוהה ביטוי תאריך. שאל את הלקוח לאיזה יום או תאריך הוא מתכוון (למשל: "ראשון", "מחר", "26.7").',
  }
}
