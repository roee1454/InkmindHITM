import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSession } from '@/lib/session.server'
import { canEditLead } from '../utils/permissions'
import type { RecordModel } from 'pocketbase'
import type { LeadStage, UILead } from '../types'
import { STAGE_CONFIG } from '../types'

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error('לא מחובר.')
  return session
}

function toUILead(customer: RecordModel, conversation: RecordModel | undefined): UILead {
  const rawStage = (conversation?.state || customer.lead_stage || 'NEW') as LeadStage
  const stage = rawStage in STAGE_CONFIG ? rawStage : 'NEW'

  return {
    id: customer.id,
    conversationId: conversation?.id ?? null,
    name: (customer.name as string) || null,
    phone: customer.phone as string,
    stage,
    source: (customer.source as string) || null,
    assignedStaffId: (conversation?.assigned_staff as string) || null,
    createdAt: customer.created as string,
    updatedAt: customer.updated as string,
  }
}

export const listLeads = createServerFn({ method: 'GET' }).handler(async (): Promise<UILead[]> => {
  const session = await requireSession()
  const su = await getSuperuserClient()
  const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'

  // customer↔conversation is enforced 1:1 by idx_conversations_customer, so a plain map
  // keyed by customer id is an exact join — no need for a reverse-relation expand.
  const [customers, conversations] = await Promise.all([
    su.collection('customers').getFullList({ sort: '-updated' }),
    su.collection('conversations').getFullList({ fields: 'id,customer,assigned_staff,state' }),
  ])
  const conversationByCustomerId = new Map(conversations.map((c) => [c.customer as string, c]))
  const allLeads = customers.map((customer) => toUILead(customer, conversationByCustomerId.get(customer.id)))

  if (isAdmin) return allLeads
  return allLeads.filter(
    (lead) => lead.assignedStaffId === session.staff.id || lead.assignedStaffId === null,
  )
})

const moveLeadSchema = z.object({
  customerId: z.string(),
  stage: z.enum([
    'NEW',
    'WANTS_TO_BOOK',
    'COLLECTING_INFO',
    'WAITLIST',
    'AWAIT_PRICE_OFFER',
    'AWAIT_HEALTH_NOTICE',
    'AWAIT_PAYMENT',
    'AWAIT_FINAL_CONFIRMATION',
    'AWAITING_APPOINTMENT',
    'AWAIT_NPS_SCORE',
    'COMPLETED',
  ]),
})

export const moveLead = createServerFn({ method: 'POST' })
  .validator(moveLeadSchema)
  .handler(async ({ data }): Promise<void> => {
    const session = await requireSession()
    const su = await getSuperuserClient()

    let assignedStaffId: string | null = null
    try {
      const conversation = await su
        .collection('conversations')
        .getFirstListItem(`customer = "${data.customerId}"`, { fields: 'id,assigned_staff' })
      assignedStaffId = (conversation.assigned_staff as string) || null
    } catch {
      // no conversation yet for this customer — treated as unassigned, editable by anyone
    }

    if (!canEditLead(session.staff, assignedStaffId)) {
      throw new Error('הליד הזה משויך לאיש צוות אחר — אין לך הרשאת עריכה.')
    }

    // Only the lead label. The bot's dialogue state is not a lead stage: it changes through the
    // state machine alone (the projects pipeline replaces this, see docs/projects-payments).
    await su.collection('customers').update(data.customerId, { lead_stage: data.stage })
  })
