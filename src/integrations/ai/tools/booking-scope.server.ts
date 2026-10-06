import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'

/**
 * The existing project a next session or a touch-up joins, found from the facts (never from what
 * the model says): the conversation's active project, or for a touch-up the customer's latest
 * finished piece.
 */
async function activeProject(su: PocketBase, conversationId: string): Promise<RecordModel | null> {
  const conversation = await su.collection('conversations').getOne(conversationId, { fields: 'active_project' })
  const projectId = (conversation.active_project as string) || ''
  return projectId ? su.collection('projects').getOne(projectId).catch(() => null) : null
}

/** The piece under way, when there is one: the next session belongs to it. */
export async function findNextSessionProject(su: PocketBase, conversationId: string): Promise<RecordModel | null> {
  const project = await activeProject(su, conversationId)
  return project && project.stage === 'in_progress' ? project : null
}

/** The piece a touch-up is for: the one under way or just finished, else the latest finished one. */
export async function findTouchUpProject(su: PocketBase, conversationId: string, customerId: string): Promise<RecordModel | null> {
  const project = await activeProject(su, conversationId)
  if (project && (project.stage === 'in_progress' || project.stage === 'completed')) return project
  const page = await su.collection('projects').getList(1, 1, {
    filter: su.filter("customer = {:c} && stage = 'completed'", { c: customerId }),
    sort: '-completed_at',
  })
  return page.items[0] ?? null
}

/** Whether the project already had its consultation: the next booking is then the tattoo itself. */
export async function hadConsultation(su: PocketBase, projectId: string): Promise<boolean> {
  const page = await su.collection('appointments').getList(1, 1, {
    filter: su.filter("project = {:p} && kind = 'consultation' && status = 'completed'", { p: projectId }),
    fields: 'id',
  })
  return page.totalItems > 0
}
