import { z } from 'zod'
import type PocketBase from 'pocketbase'
import type { ToolFactoryContext } from './types'
import { suggestArtistsForBot, STYLE_OPTIONS, getWorkingHoursForStaff } from '@/features/settings/server/profiles'

const STYLE_VALUES = STYLE_OPTIONS.map((o) => o.value) as [string, ...string[]]

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** PERF-6: bundle each artist's working hours into the suggestion itself. The common
 *  flow used to burn a whole extra model round-trip on `get_artist_schedule` just to
 *  answer "which days does he work?" — with hours attached, that question resolves in
 *  the same step, and `get_artist_schedule` is only needed for actual booked slots. */
async function withWorkingHours<T extends { staffId: string }>(su: PocketBase, artists: T[]) {
  return Promise.all(
    artists.map(async (artist) => ({
      ...artist,
      workingHours: (await getWorkingHoursForStaff(su, artist.staffId)).map((w) => ({
        day: DAY_NAMES[w.dayOfWeek] ?? String(w.dayOfWeek),
        startTime: w.startTime,
        endTime: w.endTime,
      })),
    })),
  )
}

export function buildArtistTools(ctx: ToolFactoryContext) {
  const { su, botTool } = ctx

  return {
    suggest_artists: botTool(
      'מחפש אמנים המתאימים לסגנון קעקוע מבוקש, או אמן ספציפי שהלקוח ציין בשם. חובה לקרוא לכלי זה ברגע שיש סגנון עיצוב, לפני בדיקת זמינות — התוצאה מספקת את staffId התקין.',
      z.object({
        style: z.string().optional().describe(`הסגנון המבוקש. חייב להיות אחד מהערכים הבאים בלבד: ${STYLE_VALUES.join(', ')}`),
        artistName: z.string().optional().describe('שם אמן ספציפי שהלקוח ביקש'),
      }),
      async ({ style, artistName }) => {
        if (!style && !artistName) {
          const allArtists = await withWorkingHours(su, await suggestArtistsForBot(su, {}))
          return {
            status: 'success',
            message: 'הצג ללקוח את כל אמני הסטודיו ובקש ממנו לבחור. הצע להראות תיק עבודות או אינסטגרם. שעות הפעילות (workingHours) מצורפות — ימים שלא מופיעים בהן סגורים, אז אפשר להציע ימים בלי get_artist_schedule; לבדיקת משבצת ספציפית עדיין חובה check_availability.',
            data: allArtists,
          }
        }
        const matches = await withWorkingHours(su, await suggestArtistsForBot(su, { style, artistName }))
        
        const isExactMatch = matches.length > 0 && matches.every(m => 
          (style ? m.styles.includes(style) : true) &&
          (artistName ? m.name.toLowerCase().includes(artistName.toLowerCase()) : true)
        )

        if ((style || artistName) && !isExactMatch) {
          return {
            status: 'fallback_all_artists',
            message: `לא נמצאו אמנים שתואמים בדיוק את הסגנון או השם. הנה כל האמנים הפעילים — הצג אותם ללקוח ובקש ממנו לבחור, והצע בנימוס תיק עבודות או אינסטגרם. שעות הפעילות של כל אמן מצורפות (workingHours).`,
            data: matches,
          }
        }
        return {
          status: 'success',
          message: 'הצג ללקוח את האמן/ים בצורה טבעית והצע תיק עבודות. שעות הפעילות מצורפות (workingHours) — אפשר להציע ימים ישירות; לבדיקת משבצת ספציפית השתמש ב-check_availability.',
          data: matches,
        }
      }
    ),
  }
}
