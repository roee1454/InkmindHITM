import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { fuzzySearchByName, mcpReadTool } from './shared'

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  admin: 'מנהל/ת',
  staff: 'איש/אשת צוות',
}

/** The anti-hallucination gate for `staffId` (mirrors `suggest_artists` in the WhatsApp
 *  customer-facing bot, `src/integrations/ai/tools/`): the owner knows staff by name, never by
 *  PocketBase record id, and has no way to know one — so any tool that takes a `staffId`
 *  (`find_free_slots`, `create_appointment`, `add_to_waitlist`, ...) must have its id resolved
 *  through this tool first, never asked of the owner directly or guessed by the model. */
export function buildStaffTools() {
  return {
    list_staff: mcpReadTool(
      'מחזיר את רשימת אנשי/נשות הצוות (מזהה, שם, תפקיד), ממוינת לפי התאמה לשם המבוקש — ההתאמה הקרובה ביותר קודם. סובלני לטעויות הקלדה ולשם חלקי, אין צורך לוודא איות מדויק מול הבעלים. יש להשתמש בכלי זה כדי לאתר את staffId הנכון לפי שם — לעולם אין לבקש מהבעלים "מזהה" של איש/אשת צוות, ואין לנחש מזהה.',
      z.object({
        query: z.string().optional().describe('חיפוש חופשי בשם — השאירו ריק כדי לקבל את כל הצוות'),
      }),
      async ({ query }) => {
        const su = await getSuperuserClient()
        const records = await su.collection('staff').getFullList({ sort: 'name' })
        const filtered = fuzzySearchByName(records, query || '', (r) => (r.name as string) || '')
        return {
          status: 'success',
          message: `נמצאו ${filtered.length} אנשי/נשות צוות.`,
          data: filtered.map((r) => ({
            staffId: r.id,
            name: r.name,
            role: r.role,
            roleLabel: ROLE_LABELS[r.role as string] || r.role,
            active: r.active !== false,
          })),
        }
      },
    ),
  }
}
