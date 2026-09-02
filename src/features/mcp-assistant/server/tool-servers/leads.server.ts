import { z } from 'zod'
import { listLeads, moveLead } from '@/features/leads/server/leads'
import { canEditLead } from '@/features/leads/lib/permissions'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { fuzzySearchByName, mcpReadTool, mcpWriteTool } from './shared'
import type { McpToolContext } from './shared'
import type { McpActionDiff } from '../types'

const STAGE_LABELS: Record<string, string> = {
  new: 'חדש',
  intake: 'איסוף פרטים',
  awaiting_price: 'ממתין להצעת מחיר',
  awaiting_payment: 'ממתין לתשלום מקדמה',
  booked: 'נקבע תור',
  expired: 'פג תוקף',
}

const stageEnum = z.enum(['new', 'intake', 'awaiting_price', 'awaiting_payment', 'booked', 'expired'])

export function buildLeadsTools(ctx: McpToolContext) {
  return {
    search_leads: mcpReadTool(
      'מחפש לידים (לקוחות פוטנציאליים) לפי שם/טלפון חלקי ו/או שלב במשפך, ממוין לפי התאמת שם — ההתאמה הקרובה ביותר קודם. סובלני לטעויות הקלדה ולשם חלקי.',
      z.object({
        query: z.string().optional().describe('חיפוש חופשי בשם או בטלפון'),
        stage: stageEnum.optional(),
      }),
      async ({ query, stage }) => {
        const all = await listLeads()
        const q = (query || '').trim().toLowerCase()
        const byStage = stage ? all.filter((lead) => lead.stage === stage) : all
        const phoneMatches = q ? byStage.filter((lead) => (lead.phone || '').includes(q)) : []
        const nameMatches = fuzzySearchByName(byStage, query || '', (lead) => lead.name || '')
        // Union, name-fuzzy-matches first (already sorted best-first) — a phone match is already
        // unambiguous, so ranking doesn't matter for those; just append any not already included.
        const filtered = q
          ? [...nameMatches, ...phoneMatches.filter((p) => !nameMatches.some((n) => n.id === p.id))]
          : byStage
        return {
          status: 'success',
          message: `נמצאו ${filtered.length} לידים.`,
          data: filtered.slice(0, 30).map((l) => ({
            customerId: l.id,
            name: l.name,
            phone: l.phone,
            stage: l.stage,
            stageLabel: STAGE_LABELS[l.stage] || l.stage,
            updatedAt: l.updatedAt,
          })),
        }
      },
    ),

    get_lead: mcpReadTool(
      'מחזיר את פרטי הליד המלאים לפי מזהה לקוח.',
      z.object({ customerId: z.string() }),
      async ({ customerId }) => {
        const all = await listLeads()
        const lead = all.find((l) => l.id === customerId)
        if (!lead) return { status: 'error', message: 'ליד לא נמצא.' }
        return { status: 'success', message: 'פרטי הליד.', data: { ...lead, stageLabel: STAGE_LABELS[lead.stage] || lead.stage } }
      },
    ),

    update_lead_stage: mcpWriteTool(
      ctx,
      'update_lead_stage',
      'מציע להעביר ליד לשלב אחר במשפך. לעולם לא מבצע את השינוי מיד — רק מציג הצעה לאישור הבעלים.',
      z.object({ customerId: z.string(), stage: stageEnum }),
      async ({ customerId, stage }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId)
        let assignedStaffId: string | null = null
        try {
          const conversation = await su
            .collection('conversations')
            .getFirstListItem(`customer = "${customerId}"`, { fields: 'assigned_staff' })
          assignedStaffId = (conversation.assigned_staff as string) || null
        } catch {
          // no conversation yet — unassigned, editable by anyone
        }
        if (!canEditLead(ctx.staff, assignedStaffId)) {
          throw new Error('הליד הזה משויך לאיש/אשת צוות אחר/ת — לבעלים אין הרשאת עריכה עליו כרגע.')
        }
        const currentStage = (customer.lead_stage as string) || 'new'
        return {
          summary: `שינוי שלב — ${(customer.name as string) || 'ליד'}`,
          rows: [
            {
              label: (customer.name as string) || (customer.phone as string) || 'ליד',
              before: STAGE_LABELS[currentStage] || currentStage,
              after: STAGE_LABELS[stage] || stage,
            },
          ],
        } satisfies McpActionDiff
      },
    ),
  }
}

/** The only place `update_lead_stage` actually mutates — routes through the exact same
 *  `canEditLead`-gated path the leads board's drag-and-drop uses, so MCP can never bypass a
 *  permission rule the rest of the app enforces. */
export async function commitLeadsAction(toolName: string, args: Record<string, unknown>): Promise<string> {
  if (toolName === 'update_lead_stage') {
    const { customerId, stage } = args as { customerId: string; stage: string }
    await moveLead({ data: { customerId, stage: stage as never } })
    return 'שלב הליד עודכן בהצלחה.'
  }
  throw new Error(`Unknown leads action: ${toolName}`)
}

export const LEADS_WRITE_TOOLS = new Set(['update_lead_stage'])
