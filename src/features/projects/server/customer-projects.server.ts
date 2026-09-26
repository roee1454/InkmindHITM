import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import type { OpenProjectOption } from '../utils/project-choice'
import { projectStageOf } from '../utils/labels'

/** A customer's projects that are neither completed nor lost, newest activity first. */
export async function handleListOpenProjects(customerId: string): Promise<OpenProjectOption[]> {
  await requireAuth()
  const su = await getSuperuserClient()
  const projects = await su.collection('projects').getFullList({
    filter: su.filter("customer = {:c} && stage != 'completed' && stage != 'lost'", { c: customerId }),
    sort: '-updated',
    fields: 'id,title,stage',
  })
  return projects.map((p) => ({ id: p.id, title: (p.title as string) || 'ללא כותרת', stage: projectStageOf(p.stage) }))
}
