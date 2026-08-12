import { z } from 'zod'
import type PocketBase from 'pocketbase'
import type { ToolFactoryContext } from './types'
import { suggestArtistsForBot, getWorkingHoursForStaff } from '@/features/settings/server/profiles'

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
      'מחפש אמן ספציפי שהלקוח ציין בשם, או מחזיר את כל אמני הסטודיו עם הביוגרפיה שלהם כדי להתאים לסגנון קעקוע מבוקש. חובה לקרוא לכלי זה ברגע שיש רעיון לקעקוע, לפני בדיקת זמינות — התוצאה מספקת את staffId התקין. אין רשימת סגנונות קבועה — יש להתאים לפי הביוגרפיה (bio) החופשית של כל אמן.',
      z.object({
        artistName: z.string().optional().describe('שם אמן ספציפי שהלקוח ביקש'),
      }),
      async ({ artistName }) => {
        if (!artistName) {
          const allArtists = await withWorkingHours(su, await suggestArtistsForBot(su, {}))
          return {
            status: 'success',
            message: 'הצג ללקוח את כל אמני הסטודיו לפי הביוגרפיה (bio) של כל אחד, ובקש ממנו לבחור בהתאם לסגנון שהוא מחפש. הצע להראות תיק עבודות או אינסטגרם. שעות הפעילות (workingHours) מצורפות — ימים שלא מופיעים בהן סגורים, אז אפשר להציע ימים בלי get_artist_schedule; לבדיקת משבצת ספציפית עדיין חובה check_availability.',
            data: allArtists,
          }
        }
        const matches = await withWorkingHours(su, await suggestArtistsForBot(su, { artistName }))

        const isExactMatch = matches.length > 0 && matches.every((m) => m.name.toLowerCase().includes(artistName.toLowerCase()))

        if (!isExactMatch) {
          return {
            status: 'fallback_all_artists',
            message: 'לא נמצא אמן שתואם בדיוק את השם. הנה כל האמנים הפעילים — הצג אותם ללקוח לפי הביוגרפיה של כל אחד ובקש ממנו לבחור, והצע בנימוס תיק עבודות או אינסטגרם. שעות הפעילות של כל אמן מצורפות (workingHours).',
            data: matches,
          }
        }
        return {
          status: 'success',
          message: 'הצג ללקוח את האמן בצורה טבעית לפי הביוגרפיה שלו והצע תיק עבודות. שעות הפעילות מצורפות (workingHours) — אפשר להציע ימים ישירות; לבדיקת משבצת ספציפית השתמש ב-check_availability.',
          data: matches,
        }
      }
    ),
  }
}
