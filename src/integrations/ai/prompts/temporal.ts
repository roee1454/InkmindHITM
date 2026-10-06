export function buildTemporalReference(): string {
  const israelTimeStr = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Jerusalem',
  })
  const today = new Date(israelTimeStr)
  const dayOfWeek = today.getDay()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - dayOfWeek)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(weekStart.getDate() + 7)
  const nextWeekEnd = new Date(nextWeekStart)
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6)

  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

  return `
<temporal_reference>
[הקשר זמן — שימוש חובה, אל תחשב תאריכים בעצמך]
- היום: ${fmt(today)} (יום ${dayNames[dayOfWeek]})
- "השבוע" (ראשון–שבת): ${fmt(weekStart)} עד ${fmt(weekEnd)}
- "שבוע הבא" (ראשון–שבת): ${fmt(nextWeekStart)} עד ${fmt(nextWeekEnd)}
השתמש אך ורק בתאריכים האלה לשאילתות יחסיות ("היום", "מחר", "השבוע", "שבוע הבא"). ל"מחר" הוסף יום אחד לתאריך "היום" שלמעלה.
איך אומרים תאריך ללקוח: בעברית טבעית ותקנית — "ראשון ה-26.7" או "מחר ב-16:00". לעולם לא פורמט ISO כמו "2026-07-26" (הוא נשאר לכלים בלבד). שנה מציינים רק אם היא לא השנה הנוכחית.
</temporal_reference>`
}
