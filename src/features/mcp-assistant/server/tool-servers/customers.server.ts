import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { mcpReadTool, mcpWriteTool } from './shared'
import type { McpToolContext } from './shared'
import type { McpActionDiff } from '../types'

const LEAD_STAGE_LABELS: Record<string, string> = {
  new: 'חדש',
  intake: 'איסוף פרטים',
  awaiting_price: 'ממתין להצעת מחיר',
  awaiting_payment: 'ממתין לתשלום מקדמה',
  booked: 'נקבע תור',
  expired: 'פג תוקף',
}

export function buildCustomerTools(ctx: McpToolContext) {
  return {
    get_customer: mcpReadTool(
      'מחזיר את פרטי הלקוח/ה המלאים (כולל היסטוריית תורים אחרונה) לפי מזהה לקוח.',
      z.object({ customerId: z.string() }),
      async ({ customerId }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId).catch(() => null)
        if (!customer) return { status: 'error', message: 'לקוח/ה לא נמצא/ה.' }
        const appointments = await su.collection('appointments').getList(1, 10, {
          filter: `customer = "${customerId}"`,
          sort: '-start_time',
        })
        return {
          status: 'success',
          message: 'פרטי הלקוח/ה.',
          data: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            isVip: Boolean(customer.is_vip),
            leadStage: customer.lead_stage,
            leadStageLabel: LEAD_STAGE_LABELS[customer.lead_stage as string] || customer.lead_stage,
            notes: customer.notes,
            recentAppointments: appointments.items.map((a) => {
              const d = new Date(a.start_time as string)
              return {
                id: a.id,
                date: toYmd(d),
                timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
                status: a.status,
                tattooDescription: a.tattoo_description || null,
              }
            }),
          },
        }
      },
    ),

    add_customer_note: mcpWriteTool(
      ctx,
      'add_customer_note',
      'מציע להוסיף הערה לתיק הלקוח/ה (למשל מסיכום שיחת טלפון). לעולם לא שומר מיד — רק מציג הצעה לאישור הבעלים.',
      z.object({
        customerId: z.string(),
        note: z.string().min(1).max(1000),
      }),
      async ({ customerId, note }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId)
        return {
          summary: `הוספת הערה — ${(customer.name as string) || customer.phone}`,
          rows: [{ label: 'הערה חדשה', before: '—', after: note }],
        } satisfies McpActionDiff
      },
    ),
  }
}

/** The only place `add_customer_note` actually mutates — prepends a dated header line onto the
 *  existing `customers.notes` text column rather than overwriting it. No staff attribution here:
 *  `dispatchCommit` (approval.ts) only threads `(toolName, args)` through to every commit
 *  function, uniformly across all tool servers — not worth widening that signature for one field. */
export async function commitCustomersAction(toolName: string, args: Record<string, unknown>): Promise<string> {
  if (toolName !== 'add_customer_note') throw new Error(`Unknown customers action: ${toolName}`)
  const { customerId, note } = args as { customerId: string; note: string }
  const su = await getSuperuserClient()
  const customer = await su.collection('customers').getOne(customerId)
  const existingNotes = (customer.notes as string) || ''
  const dateLabel = toYmd(new Date())
  const entry = `[${dateLabel}] ${note}`
  const updatedNotes = existingNotes ? `${entry}\n\n${existingNotes}` : entry
  await su.collection('customers').update(customerId, { notes: updatedNotes })
  return 'ההערה נוספה בהצלחה.'
}

export const CUSTOMERS_WRITE_TOOLS = new Set(['add_customer_note'])
