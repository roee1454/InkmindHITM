import { z } from 'zod'
import { listLeads } from '@/features/leads/server/leads'
import { conversationStateLabel } from '@/features/conversations/utils/labels'
import { fuzzySearchByName, mcpReadTool } from './shared'

const stageEnum = z.enum([
  'NEW',
  'WANTS_TO_BOOK',
  'COLLECTING_INFO',
  'WAITLIST',
  'AWAIT_PRICE_OFFER',
  'AWAIT_HEALTH_NOTICE',
  'AWAIT_PAYMENT',
  'AWAIT_FINAL_CONFIRMATION',
  'AWAITING_APPOINTMENT',
  'PROJECT_IN_PROGRESS',
  'AWAIT_NPS_SCORE',
  'COMPLETED',
])

export function buildLeadsTools() {
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
            stageLabel: conversationStateLabel(l.stage),
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
        return { status: 'success', message: 'פרטי הליד.', data: { ...lead, stageLabel: conversationStateLabel(lead.stage) } }
      },
    ),
  }
}
