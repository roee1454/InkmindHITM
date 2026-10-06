import { z } from 'zod'
import type PocketBase from 'pocketbase'
import type { ToolFactoryContext } from './types'
import { suggestArtistsForBot, getWorkingHoursForStaff } from '@/features/settings/server/staff'
import { DETERMINISTIC_TEMPLATES, sendDeterministicMessage } from '../engine/deterministic-templates'

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
      'מחזיר ושולח את כל אמני הסטודיו הפעילים עם תיקי העבודות שלהם. יש לקרוא לכלי זה אך ורק כשמציגים את אמני הסטודיו ללקוח שטרם בחר אמן. אין לקרוא לכלי כאשר הלקוח כבר ציין או בחר אמן (למשל: "אני רוצה עם דור", "בא לי את דור") — במקרה כזה המשך ישירות ובטבעיות בבירור מועדים מול שעות הפעילות שלו.',
      z.object({
        artistName: z.string().optional().describe('העבר רק אם הלקוח מבקש במפורש מידע או תיק עבודות של אמן ספציפי'),
      }),
      async ({ artistName }) => {
        if (!artistName) {
          const allArtists = await withWorkingHours(su, await suggestArtistsForBot(su, {}))
          const templateText = DETERMINISTIC_TEMPLATES.artistsList({
            artists: allArtists.map((a) => ({ name: a.name, portfolioUrl: a.portfolioUrl })),
          })
          const { sent } = await sendDeterministicMessage(ctx, templateText)
          return {
            status: 'success',
            message: sent
              ? 'הודעת אמני הסטודיו נשלחה ללקוח בוואטסאפ. אל תחזור על שמותיהם או קישוריהם בטקסט חופשי.'
              : 'הצג ללקוח את אמני הסטודיו בהודעה מרוכזת: לכל אמן הצג רק את שמו ואת הקישור לתיק העבודות.',
            data: allArtists,
          }
        }
        const matches = await withWorkingHours(su, await suggestArtistsForBot(su, { artistName }))

        const isExactMatch = matches.length > 0 && matches.every((m) => m.name.toLowerCase().includes(artistName.toLowerCase()))

        if (!isExactMatch) {
          return {
            status: 'fallback_all_artists',
            message: 'לא נמצא אמן בשם זה. הנה כל אמני הסטודיו ושעות הפעילות שלהם — ענה ללקוח בטבעיות.',
            data: matches,
          }
        }

        return {
          status: 'success',
          message: 'הנה פרטי האמן ושעות הפעילות שלו (workingHours). ענה ללקוח בחום ובטבעיות עם ימי ושעות הפעילות שלו (לעולם אל תשתמש בדיווח רובוטי כמו "האמן נבחר"), ושאל מתי נוח לו לתאם או בדוק זמינות ביומן.',
          data: matches,
        }
      },
    ),
  }
}
