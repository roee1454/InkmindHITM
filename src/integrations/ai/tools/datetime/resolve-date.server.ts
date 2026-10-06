import { z } from 'zod'
import type { ToolFactoryContext } from '../types'
import { resolveHebrewDateExpression } from './date-resolution-engine'

export function buildDateTools(ctx: ToolFactoryContext) {
  const { botTool } = ctx

  return {
    resolve_date: botTool(
      'ממיר ביטוי תאריך ושעה בעברית ("מחר ב-14:00", "ראשון הבא", "15 באוגוסט", "עוד שבועיים") לתאריך מדויק ולשעה מבוקשת. חובה להשתמש בו לכל ביטוי תאריך או שעה שאינו טריוויאלי במקום לחשב לבד.',
      z.object({
        expression: z.string().min(1).describe('ביטוי התאריך והשעה כפי שהלקוח כתב אותו (למשל: "מחר ב-14:00", "ראשון הבא", "15 באוגוסט")'),
      }),
      async ({ expression }) => {
        const result = resolveHebrewDateExpression(expression)
        if (result.status === 'resolved') {
          const timeSlotHint = result.timeSlot ? ` שעה מבוקשת: ${result.timeSlot}.` : ''
          const timeHint = result.timeOfDay ? ` מועד ביום: ${result.timeOfDay}.` : ''
          return {
            status: 'success',
            message: `התאריך: ${result.date} (${result.spoken}).${timeSlotHint}${timeHint}${result.note ? ` שים לב: ${result.note}` : ''} ללקוח תגיד "${result.spoken}"${result.timeSlot ? ` בשעה ${result.timeSlot}` : ''}, לכלים תעביר ${result.date}${result.timeSlot ? ` ושעה ${result.timeSlot}` : ''}.`,
            data: result,
          }
        }
        return { status: result.status, message: result.message, data: result }
      },
    ),
  }
}
