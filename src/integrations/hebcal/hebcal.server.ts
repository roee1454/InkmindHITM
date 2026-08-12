/**
 * Thin wrapper around Hebcal.com's public REST API (https://www.hebcal.com/hebcal) — no SDK,
 * just a plain fetch. Used to let the studio owner one-click "close forever" on Jewish
 * holidays from the closures Add modal (see src/features/settings/server/closures.ts).
 *
 * Verified live: the API returns per-year dated entries (no native recurrence — the studio's
 * "close forever" semantics are our own month/day-matching logic, see isStudioClosedOn), and
 * multi-day holidays (Pesach, Sukkot) arrive as separate per-day entries ("Pesach I", "Pesach
 * II", ...), not a single date range.
 *
 * Per Hebcal's Creative Commons Attribution license, UI surfacing this data should credit
 * Hebcal.com.
 */

interface HebcalApiItem {
  title: string
  date: string
  hebrew?: string
  category?: string
}

interface HebcalApiResponse {
  items?: HebcalApiItem[]
}

export interface HebcalHoliday {
  /** English title, e.g. "Yom Kippur" or "Pesach I". */
  title: string
  /** ISO date (YYYY-MM-DD) for this specific year's occurrence. */
  date: string
  /** Hebrew title, e.g. "יום כיפור". */
  hebrew: string
}

/** `includeMinor` also requests minor holidays/fasts (Hebcal's `min=on`) — the "אני אדם דתי"
 *  preset in the closures picker, vs. major-only ("אני אדם מסורתי"). */
export async function fetchJewishHolidays(year: number, includeMinor = false): Promise<HebcalHoliday[]> {
  const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on${includeMinor ? '&min=on' : ''}&year=${year}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Hebcal API request failed: ${res.status}`)
  }
  const data = (await res.json()) as HebcalApiResponse
  const items = data.items ?? []

  return items
    .filter((item) => item.category === 'holiday' && item.date && !(item.hebrew ?? '').includes('נדחה'))
    .map((item) => ({
      title: stripHebrewYearSuffix(item.title),
      date: item.date,
      hebrew: stripHebrewYearSuffix(item.hebrew ?? ''),
    }))
}

/** Hebcal appends the Hebrew (civil) year number to Rosh Hashana specifically — e.g. "Rosh
 *  Hashana 5787" / "ראש השנה 5787" — unlike every other holiday title. Left in, that breaks both
 *  display ("not a real holiday name") and title-based grouping across years, since each year
 *  would get a distinct title. */
function stripHebrewYearSuffix(text: string): string {
  return text.replace(/\s+\d{4}$/, '').trim()
}
