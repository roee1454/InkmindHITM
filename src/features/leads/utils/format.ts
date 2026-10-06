/** Full date (matches WAHA's `toLocaleDateString('he-IL')` on the card footer) — distinct
 *  from the conversations feature's time-of-day/short-date formatters. */
export function formatLeadDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('he-IL')
}
