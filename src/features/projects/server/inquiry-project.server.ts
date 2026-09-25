import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'

/**
 * A project exists from the moment a customer says they want to book, not only once a slot is
 * held — otherwise everyone who asked and never booked is invisible in the funnel. The bot's
 * conversation points at it through `active_project`; the hold the bot creates later joins it.
 */

/** Title until the customer describes the piece; replaced by the first hold's description. */
export const INQUIRY_TITLE = 'פנייה חדשה'

async function findOpenProject(su: PocketBase, projectId: string): Promise<RecordModel | null> {
  if (!projectId) return null
  const project = await su.collection('projects').getOne(projectId).catch(() => null)
  if (!project || project.lost_at || project.completed_at) return null
  return project
}

async function hasAppointments(su: PocketBase, projectId: string): Promise<boolean> {
  const page = await su.collection('appointments').getList(1, 1, { filter: su.filter('project = {:p}', { p: projectId }), fields: 'id' })
  return page.totalItems > 0
}

/**
 * The project the bot is booking for.
 * - `continue`: keep the open active project (e.g. the tattoo after a consultation), else start one.
 * - `new`: the customer asked for a new booking — a fresh project, unless the active one is an
 *   empty inquiry that never got an appointment (reused, so repeated "I want to book" doesn't pile
 *   up empty projects).
 */
export async function ensureInquiryProject(
  su: PocketBase,
  conversationId: string,
  customerId: string,
  mode: 'continue' | 'new',
): Promise<string> {
  const conversation = await su.collection('conversations').getOne(conversationId)
  const active = await findOpenProject(su, (conversation.active_project as string) || '')
  if (active && (mode === 'continue' || !(await hasAppointments(su, active.id)))) return active.id

  const project = await su.collection('projects').create({
    customer: customerId,
    title: INQUIRY_TITLE,
    primary_staff: (conversation.assigned_staff as string) || '',
    stage_actor: 'bot',
    stage_reason: 'booking_started',
  })
  await su.collection('conversations').update(conversationId, { active_project: project.id })
  return project.id
}

/** Gives an inquiry project its real title once the customer described the piece. */
export async function titleInquiryProject(su: PocketBase, projectId: string, description: string): Promise<void> {
  const project = await su.collection('projects').getOne(projectId).catch(() => null)
  if (!project || project.title !== INQUIRY_TITLE) return
  const title = description.trim().slice(0, 200)
  if (title) await su.collection('projects').update(projectId, { title })
}
