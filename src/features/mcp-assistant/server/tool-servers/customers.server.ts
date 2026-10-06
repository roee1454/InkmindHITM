import { z } from 'zod'
import { loadCustomerLifecycles } from '@/features/customers/server/customer-lifecycle.server'
import { CUSTOMER_LIFECYCLE_LABELS } from '@/features/customers/utils/lifecycle'
import { PROJECT_STAGE_LABELS } from '@/features/projects/utils/labels'
import type { ProjectStage } from '@/features/projects/types'
import { conversationStateLabel } from '@/features/conversations/utils/labels'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { mcpReadTool, mcpWriteTool } from './shared'
import type { McpToolContext } from './shared'
import type { McpActionDiff } from '../types'

export function buildCustomerTools(ctx: McpToolContext) {
  return {
    get_customer: mcpReadTool(
      'מחזיר את פרטי הלקוח/ה המלאים (כולל פרויקטים, היסטוריית תורים אחרונה, ומצב שיחת הוואטסאפ) לפי מזהה לקוח.',
      z.object({ customerId: z.string() }),
      async ({ customerId }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId).catch(() => null)
        if (!customer) return { status: 'error', message: 'לקוח/ה לא נמצא/ה.' }

        const [appointments, lifecycleOf, projects, conversation] = await Promise.all([
          su.collection('appointments').getList(1, 10, { filter: `customer = "${customerId}"`, sort: '-start_time' }),
          loadCustomerLifecycles(su),
          su
            .collection('projects')
            .getFullList({ filter: su.filter('customer = {:c}', { c: customerId }), sort: '-created' })
            .catch(() => []),
          su
            .collection('conversations')
            .getFirstListItem(su.filter('customer = {:c}', { c: customerId }))
            .catch(() => null),
        ])

        const lifecycle = lifecycleOf(customer.id)

        const activeProject = projects.find((p) => p.stage !== 'completed' && p.stage !== 'lost')

        return {
          status: 'success',
          message: 'פרטי הלקוח/ה.',
          data: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            isVip: Boolean(customer.is_vip),
            lifecycle,
            lifecycleLabel: CUSTOMER_LIFECYCLE_LABELS[lifecycle],
            notes: customer.notes,
            activeProject: activeProject
              ? {
                  id: activeProject.id,
                  title: activeProject.title,
                  stage: activeProject.stage,
                  stageLabel: PROJECT_STAGE_LABELS[activeProject.stage as ProjectStage] || activeProject.stage,
                  quoteMin: activeProject.quote_min != null ? Number(activeProject.quote_min) : null,
                  quoteMax: activeProject.quote_max != null ? Number(activeProject.quote_max) : null,
                }
              : null,
            projects: projects.map((p) => ({
              id: p.id,
              title: p.title,
              stage: p.stage,
              stageLabel: PROJECT_STAGE_LABELS[p.stage as ProjectStage] || p.stage,
            })),
            conversation: conversation
              ? {
                  id: conversation.id,
                  status: conversation.status,
                  state: conversation.state,
                  stateLabel: conversationStateLabel((conversation.state as string) || 'NEW'),
                  lastMessagePreview: (conversation.last_message_preview as string) || null,
                  lastMessageAt: (conversation.last_message_at as string) || null,
                }
              : null,
            recentAppointments: appointments.items.map((a) => {
              const d = new Date(a.start_time as string)
              const kind = (a.kind as string) || 'session'
              return {
                id: a.id,
                kind,
                kindLabel: kind === 'session' ? 'סשן קעקוע' : kind === 'consultation' ? 'פגישת ייעוץ' : "טאץ'-אפ",
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

/** The only place `add_customer_note` actually mutates */
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
