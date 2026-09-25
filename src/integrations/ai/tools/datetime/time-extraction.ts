import { SPOKEN_HOURS } from './hebrew-lexicon'

export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'

/**
 * Extracts exact clock hours (HH:MM or 14:00 / שתיים בצהריים) and coarse time-of-day
 * periods from the raw Hebrew string, returning the cleaned date-only string.
 */
export function extractTimeDetails(raw: string): {
  cleanedExpr: string
  timeSlot?: string
  timeOfDay?: TimeOfDay
  timeLabel?: string
} {
  let expr = raw.trim()
  let timeSlot: string | undefined
  let timeOfDay: TimeOfDay | undefined
  let timeLabel: string | undefined

  // 1. Exact numeric HH:MM time: e.g. "14:00", "14.30", "ב-14:00", "בשעה 16:30", "ב 11:15"
  const numericTimeRegex = /(?:^|\s+)(?:(?:ב|ל)-?\s*|בשעה\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s+|$)/
  const numMatch = expr.match(numericTimeRegex)
  if (numMatch && numMatch[1] !== undefined && numMatch[2] !== undefined) {
    const hh = Number(numMatch[1])
    const mm = Number(numMatch[2])
    timeSlot = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    expr = expr.replace(numMatch[0], ' ')

    if (hh < 12) timeOfDay = 'morning'
    else if (hh < 15) timeOfDay = 'noon'
    else if (hh < 18) timeOfDay = 'afternoon'
    else if (hh < 22) timeOfDay = 'evening'
    else timeOfDay = 'night'
  }

  // 2. Numeric hour with period / word: e.g. "ב-2 בצהריים", "ב-4 אחה״צ", "ב-10 בבוקר", "בשמונה בערב"
  if (!timeSlot) {
    const hourWithModifierRegex = /(?:^|\s+)(?:(?:ב|ל)-?\s*|בשעה\s+)?([1-9]|1[0-2])(?::00)?\s*(בבוקר|לפני\s+הצהריים|בצהריים|אחה״צ|אחהצ|אחר\s+הצהריים|בערב|בלילה)(?:\s+|$)/
    const hourModMatch = expr.match(hourWithModifierRegex)
    if (hourModMatch && hourModMatch[1] && hourModMatch[2]) {
      let hh = Number(hourModMatch[1])
      const mod = hourModMatch[2]
      if (mod.includes('צהריים') && !mod.includes('לפני') && !mod.includes('אחר')) {
        hh = hh === 12 ? 12 : hh + 12
        timeOfDay = 'noon'
      } else if (mod.includes('אחה') || mod.includes('אחר')) {
        hh = hh < 12 ? hh + 12 : hh
        timeOfDay = 'afternoon'
      } else if (mod.includes('ערב')) {
        hh = hh < 12 ? hh + 12 : hh
        timeOfDay = 'evening'
      } else if (mod.includes('לילה')) {
        hh = hh < 12 ? hh + 12 : hh
        timeOfDay = 'night'
      } else {
        timeOfDay = 'morning'
      }
      timeSlot = `${String(hh).padStart(2, '0')}:00`
      expr = expr.replace(hourModMatch[0], ' ')
    }
  }

  // 3. Spoken Hebrew hour with period: e.g. "בשתיים בצהריים", "בארבע אחה״צ", "בעשר בבוקר"
  if (!timeSlot) {
    const spokenHourRegex = /(?:^|\s+)(?:(?:ב|ל)-?\s*|בשעה\s+)?(אחת|שתיים|שתים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר|אחת\s+עשרה|שתים\s+עשרה|שתיים\s+עשרה)(?:\s+(וחצי|ורבע))?\s*(בבוקר|לפני\s+הצהריים|בצהריים|אחה״צ|אחהצ|אחר\s+הצהריים|בערב|בלילה)?(?:\s+|$)/
    const spokenMatch = expr.match(spokenHourRegex)
    if (spokenMatch && spokenMatch[1]) {
      const baseHour = SPOKEN_HOURS[spokenMatch[1].replace(/\s+/g, ' ')]
      if (baseHour) {
        let hh = baseHour
        let mm = 0
        if (spokenMatch[2] === 'וחצי') mm = 30
        if (spokenMatch[2] === 'ורבע') mm = 15

        const mod = spokenMatch[3]
        if (mod) {
          if (mod.includes('צהריים') && !mod.includes('לפני') && !mod.includes('אחר')) {
            hh = hh === 12 ? 12 : hh + 12
            timeOfDay = 'noon'
          } else if (mod.includes('אחה') || mod.includes('אחר')) {
            hh = hh < 12 ? hh + 12 : hh
            timeOfDay = 'afternoon'
          } else if (mod.includes('ערב')) {
            hh = hh < 12 ? hh + 12 : hh
            timeOfDay = 'evening'
          } else if (mod.includes('לילה')) {
            hh = hh < 12 ? hh + 12 : hh
            timeOfDay = 'night'
          } else {
            timeOfDay = 'morning'
          }
          timeSlot = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
          expr = expr.replace(spokenMatch[0], ' ')
        }
      }
    }
  }

  // 4. Coarse time-of-day periods (if no exact timeSlot extracted)
  const COARSE_PATTERNS: Array<{ regex: RegExp; label: string; timeOfDay: TimeOfDay }> = [
    { regex: /(?:^|\s+)(?:על\s+הבוקר|מוקדם\s+בבוקר|ב?בוקר|לפני\s+הצהריים)(?:\s+|$)/, label: 'בוקר', timeOfDay: 'morning' },
    { regex: /(?:^|\s+)(?:ב?צהריים)(?:\s+|$)/, label: 'צהריים', timeOfDay: 'noon' },
    { regex: /(?:^|\s+)(?:אחר\s+הצהריים|אחה״צ|אחהצ|אחר\s*צהריים|צהריים\s+מאוחרות)(?:\s+|$)/, label: 'אחר הצהריים', timeOfDay: 'afternoon' },
    { regex: /(?:^|\s+)(?:בשעות\s+הערב|ערב\s+מאוחר|ב?ערב)(?:\s+|$)/, label: 'ערב', timeOfDay: 'evening' },
    { regex: /(?:^|\s+)(?:ב?לילה)(?:\s+|$)/, label: 'לילה', timeOfDay: 'night' },
  ]

  for (const p of COARSE_PATTERNS) {
    if (p.regex.test(expr)) {
      if (!timeOfDay) timeOfDay = p.timeOfDay
      timeLabel = p.label
      expr = expr.replace(p.regex, ' ')
      break
    }
  }

  return {
    cleanedExpr: expr.replace(/\s+/g, ' ').trim(),
    timeSlot,
    timeOfDay,
    timeLabel,
  }
}

/** Strips niqqud-less prefixes ("ב", "ל") and punctuation from tokens. */
export function normalize(raw: string): string {
  let cleaned = raw
    .replace(/["'׳״]/g, '') // סופ"ש → סופש
    .replace(/[?!,]/g, ' ') // NOT '.' — dots are date separators (26.7)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '') // a sentence-final dot ("מחר.") isn't part of the expression

  // Common typo fixes
  cleaned = cleaned.replace(/^שבועהבא$/, 'שבוע הבא')
  cleaned = cleaned.replace(/^סופשבוע$/, 'סוף שבוע')

  // Strip Hebrew preposition prefixes before digits: ב-26.7, ב 26.7, ב26.7, ל-26.7 -> 26.7
  cleaned = cleaned.replace(/^[בל]-?\s*(?=\d)/, '')

  // Strip trailing or dangling prepositions like "מחר ב" -> "מחר"
  cleaned = cleaned.replace(/\s+[בל]$/, '')
  cleaned = cleaned.replace(/^[בל]\s+/, '')
  return cleaned
}
