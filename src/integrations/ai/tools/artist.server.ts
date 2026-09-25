import { z } from 'zod'
import type PocketBase from 'pocketbase'
import type { ToolFactoryContext } from './types'
import { suggestArtistsForBot, getWorkingHoursForStaff } from '@/features/settings/server/staff'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** Format working hours with Hebrew day names attached. */
async function withWorkingHours<T extends { staffId: string; workingHours?: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }>(
  su: PocketBase,
  artists: T[],
) {
  return Promise.all(
    artists.map(async (artist) => {
      const rawHours = artist.workingHours ?? (await getWorkingHoursForStaff(su, artist.staffId))
      return {
        ...artist,
        workingHours: rawHours.map((w) => ({
          day: DAY_NAMES[w.dayOfWeek] ?? String(w.dayOfWeek),
          startTime: w.startTime,
          endTime: w.endTime,
        })),
      }
    }),
  )
}

export function buildArtistTools(ctx: ToolFactoryContext) {
  const { su, botTool } = ctx

  return {
    suggest_artists: botTool(
      'מחזיר את כל אמני הסטודיו הפעילים עם תיקי העבודות שלהם ושעות הפעילות (או מחפש לפי שם אמן מבוקש). יש להציג את האמנים ללקוח בהודעה מרוכזת עם שמותיהם, תחום התמחותם התמציתי (לפי ה-bio) והקישור לתיק העבודות.',
      z.object({
        artistName: z.string().optional().describe('שם אמן ספציפי שהלקוח ביקש'),
      }),
      async ({ artistName }) => {
        if (!artistName) {
          const allArtists = await withWorkingHours(su, await suggestArtistsForBot(su, {}))
          return {
            status: 'success',
            message: 'הצג ללקוח את אמני הסטודיו בהודעה מרוכזת. לכל אמן הצג את שמו, תחום התמחותו התמציתי (מתוך ה-bio) ואת הקישור לתיק העבודות (portfolioUrl). אם לאמן אין קישור, ציין את תחום התמחותו בלבד.',
            data: allArtists,
          }
        }
        const matches = await withWorkingHours(su, await suggestArtistsForBot(su, { artistName }))

        const isExactMatch = matches.length > 0 && matches.every((m) => m.name.toLowerCase().includes(artistName.toLowerCase()))

        if (!isExactMatch) {
          return {
            status: 'fallback_all_artists',
            message: 'לא נמצא אמן בשם זה. הנה כל אמני הסטודיו — הצג אותם בהודעה מרוכזת עם שמותיהם, תחום התמחותם (bio) והקישור לתיק העבודות (portfolioUrl).',
            data: matches,
          }
        }
        return {
          status: 'success',
          message: 'הצג ללקוח את האמן המבוקש עם תחום התמחותו (bio) והקישור לתיק העבודות שלו (portfolioUrl). שעות הפעילות מצורפות (workingHours).',
          data: matches,
        }
      },
    ),
  }
}
