import type PocketBase from 'pocketbase'
import { loadProjectFinance } from '@/features/payments/server/project-finance.server'
import { loadProjectPolicy } from '@/features/settings/server/project-policy'
import { projectStageOf } from '@/features/projects/utils/labels'
import { toProjectPromptContext } from '../prompts/project-context'
import type { ProjectPromptContext } from '../prompts/project-context'

/**
 * The project the bot turn is about, for the prompt (prompts/project-context.ts). A turn never fails
 * because of it: without the context the bot still answers, just less informed.
 */
export async function loadProjectPromptContext(su: PocketBase, projectId: string, now: Date): Promise<ProjectPromptContext | null> {
  if (!projectId) return null
  try {
    const [finance, project, policy] = await Promise.all([
      loadProjectFinance(su, projectId),
      su.collection('projects').getOne(projectId, { fields: 'stage' }),
      loadProjectPolicy(su),
    ])
    return toProjectPromptContext(
      {
        title: finance.title,
        stage: projectStageOf(project.stage),
        estimatedSessions: finance.estimatedSessions,
        quoteMin: finance.quoteMin,
        quoteMax: finance.quoteMax,
        appointments: finance.appointments,
        payments: finance.payments,
        balance: finance.balance,
        healingPeriodDays: policy.healingPeriodDays,
        touchUp: policy.touchUp,
        depositApplication: policy.depositApplication,
      },
      now,
    )
  } catch (err) {
    console.error(`[agent] loading project ${projectId} for the prompt failed:`, err)
    return null
  }
}
