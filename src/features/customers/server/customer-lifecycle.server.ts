import type PocketBase from 'pocketbase'
import { loadProjectPolicy } from '@/features/settings/server/project-policy'
import { projectStageOf } from '@/features/projects/utils/labels'
import { deriveCustomerLifecycle } from '../utils/lifecycle'
import type { CustomerLifecycle, LifecycleProject } from '../utils/lifecycle'

/**
 * Every customer's lifecycle, derived from their projects (utils/lifecycle.ts). It reads every
 * project and completed session, not only one artist's: the lifecycle is a fact about the customer.
 */
export async function loadCustomerLifecycles(su: PocketBase, now: Date = new Date()): Promise<(customerId: string) => CustomerLifecycle> {
  const [projects, sessions, policy] = await Promise.all([
    su.collection('projects').getFullList({ fields: 'id,customer,stage,created' }).catch(() => []),
    su
      .collection('appointments')
      .getFullList({ filter: "kind = 'session' && status = 'completed' && project != ''", fields: 'project,start_time' })
      .catch(() => []),
    loadProjectPolicy(su),
  ])

  const sessionDatesByProject = new Map<string, string[]>()
  for (const session of sessions) {
    const dates = sessionDatesByProject.get(session.project as string) ?? []
    dates.push(session.start_time as string)
    sessionDatesByProject.set(session.project as string, dates)
  }
  const projectsByCustomer = new Map<string, LifecycleProject[]>()
  for (const project of projects) {
    const list = projectsByCustomer.get(project.customer as string) ?? []
    list.push({ stage: projectStageOf(project.stage), createdAt: project.created as string, sessionDates: sessionDatesByProject.get(project.id) ?? [] })
    projectsByCustomer.set(project.customer as string, list)
  }
  return (customerId) => deriveCustomerLifecycle(projectsByCustomer.get(customerId) ?? [], now, policy.dormantAfterMonths)
}
