import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { loadPipeline } from '@/features/projects/server/pipeline.server'
import { handleGetProjectDetails } from '@/features/projects/server/project-details.server'
import {
  handleMarkProjectLost,
  handleReopenProject,
  handleCompleteProject,
} from '@/features/projects/server/project-milestones.server'
import { PROJECT_STAGES, LOST_REASONS } from '@/features/projects/types'
import type { LostReason, ProjectStage } from '@/features/projects/types'
import { PROJECT_STAGE_LABELS, LOST_REASON_LABELS } from '@/features/projects/utils/labels'
import { mcpReadTool, mcpWriteTool } from './shared'
import type { McpToolContext } from './shared'
import type { McpActionDiff } from '../types'

export function buildProjectsTools(ctx: McpToolContext) {
  return {
    search_projects: mcpReadTool(
      'מחפש פרויקטים של לקוחות לפי שם לקוח, טלפון, שם פרויקט או שלב במשפך (inquiry, consultation_scheduled, consultation_done, quoted, booked, in_progress, completed, lost).',
      z.object({
        query: z.string().optional().describe('חיפוש חופשי בשם הלקוח/ה, טלפון או כותרת הפרויקט'),
        stage: z.enum(PROJECT_STAGES).optional().describe('סינון לפי שלב הפרויקט'),
        staffId: z.string().optional().describe('סינון לפי מזהה איש/אשת צוות משויך'),
      }),
      async ({ query, stage, staffId }) => {
        const su = await getSuperuserClient()
        const pipeline = await loadPipeline(
          su,
          { role: ctx.staff.role, id: ctx.staff.id },
          new Date(),
        )

        let projects = pipeline.projects

        if (stage) {
          projects = projects.filter((p) => p.stage === stage)
        }
        if (staffId) {
          projects = projects.filter((p) => p.staffId === staffId)
        }

        const q = (query || '').trim().toLowerCase()
        if (q) {
          projects = projects.filter((p) => {
            const nameMatch = (p.customerName || '').toLowerCase().includes(q)
            const phoneMatch = (p.customerPhone || '').includes(q)
            const titleMatch = (p.title || '').toLowerCase().includes(q)
            return nameMatch || phoneMatch || titleMatch
          })
        }

        const data = projects.map((p) => {
          const sessionsProgress = p.estimatedSessions
            ? `סשן ${p.sessionsDone} מתוך ~${p.estimatedSessions}`
            : p.sessionsDone > 0
              ? `בוצעו ${p.sessionsDone} סשנים`
              : 'טרם החלו סשנים'

          return {
            projectId: p.projectId,
            title: p.title,
            customerId: p.customerId,
            customerName: p.customerName || 'ללא שם',
            customerPhone: p.customerPhone,
            stage: p.stage,
            stageLabel: PROJECT_STAGE_LABELS[p.stage] || p.stage,
            artistName: p.staffName || 'לא משויך',
            progress: sessionsProgress,
            quote: p.quoteMin && p.quoteMax ? `₪${p.quoteMin}–₪${p.quoteMax}` : null,
            balanceDueIls: p.due,
            creditIls: p.credit,
            nextAppointmentAt: p.nextAppointmentAt,
            lostReason: p.lostReason ? LOST_REASON_LABELS[p.lostReason] || p.lostReason : null,
            lostNote: p.lostNote,
          }
        })

        return {
          status: 'success',
          message: `נמצאו ${data.length} פרויקטים.`,
          data: data.slice(0, 30),
        }
      },
    ),

    get_project: mcpReadTool(
      'מחזיר את הפרטים המלאים של פרויקט: שלב, הצעת מחיר, יתרות לתשלום, והיסטוריית ציר הזמן של התורים (סשנים/ייעוצים).',
      z.object({
        projectId: z.string().describe('מזהה הפרויקט'),
      }),
      async ({ projectId }) => {
        const su = await getSuperuserClient()
        try {
          const details = await handleGetProjectDetails(projectId, {
            su,
            actor: { id: ctx.staff.id, role: ctx.staff.role },
          })

          return {
            status: 'success',
            message: `פרטי פרויקט: ${details.title}.`,
            data: {
              id: details.id,
              title: details.title,
              stage: details.stage,
              stageLabel: PROJECT_STAGE_LABELS[details.stage] || details.stage,
              customer: details.customer,
              quoteMin: details.quoteMin,
              quoteMax: details.quoteMax,
              estimatedSessions: details.estimatedSessions,
              lostReason: details.lostReason ? LOST_REASON_LABELS[details.lostReason] || details.lostReason : null,
              lostNote: details.lostNote,
              timeline: details.timeline.map((t) => ({
                id: t.id,
                kind: t.kind,
                kindLabel: t.kind === 'session' ? 'סשן קעקוע' : t.kind === 'consultation' ? 'פגישת ייעוץ' : "טאץ'-אפ",
                status: t.status,
                date: t.date,
                timeSlot: t.timeSlot,
                sessionNumber: t.projectPosition?.sessionNumber ?? null,
              })),
            },
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'שגיאה בטעינת הפרויקט.'
          return { status: 'error', message: msg }
        }
      },
    ),

    update_project_stage: mcpWriteTool(
      ctx,
      'update_project_stage',
      'מציע לעדכן שלב פרויקט יזום: סימון כאבוד (mark_lost) עם סיבה, פתיחה מחדש (reopen), או סיום ידני (complete_manually). לעולם לא משנה מיד — רק מציג הצעה לאישור.',
      z.object({
        projectId: z.string().describe('מזהה הפרויקט לעדכון'),
        action: z.enum(['mark_lost', 'reopen', 'complete_manually']).describe('הפעולה המבוקשת'),
        reason: z.enum(LOST_REASONS).optional().describe('סיבת האובדן (חובה אם הפעולה היא mark_lost)'),
        note: z.string().optional().describe('הערה חופשית נוספת'),
      }),
      async ({ projectId, action, reason, note }) => {
        const su = await getSuperuserClient()
        const project = await su.collection('projects').getOne(projectId, { expand: 'customer' })
        const customer = project.expand?.customer as Record<string, unknown> | undefined
        const customerName = (customer?.name as string) || 'לקוח ללא שם'

        if (action === 'mark_lost' && !reason) {
          throw new Error('יש לציין סיבת אובדן (reason) כאשר מסמנים פרויקט כאבוד.')
        }

        let actionDesc = ''
        if (action === 'mark_lost') {
          actionDesc = `סימון כאבוד (${reason ? LOST_REASON_LABELS[reason] || reason : ''})`
        } else if (action === 'reopen') {
          actionDesc = 'פתיחה מחדש'
        } else if (action === 'complete_manually') {
          actionDesc = 'סיום ידני'
        }

        const rows = [
          {
            label: 'פעולה',
            before: PROJECT_STAGE_LABELS[project.stage as ProjectStage] || (project.stage as string),
            after: actionDesc,
          },
        ]
        if (note) {
          rows.push({ label: 'הערה', before: '—', after: note })
        }

        return {
          summary: `עדכון שלב פרויקט — ${(project.title as string) || 'פרויקט'} (${customerName})`,
          rows,
        } satisfies McpActionDiff
      },
    ),
  }
}

export async function commitProjectsAction(
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  if (toolName !== 'update_project_stage') throw new Error(`Unknown projects action: ${toolName}`)

  const { projectId, action, reason, note } = args as {
    projectId: string
    action: 'mark_lost' | 'reopen' | 'complete_manually'
    reason?: LostReason
    note?: string
  }

  const su = await getSuperuserClient()

  if (action === 'mark_lost') {
    if (!reason) throw new Error('סיבת אובדן חסרה.')
    await handleMarkProjectLost({ projectId, reason, note }, { su })
    return 'הפרויקט סומן כאבוד בהצלחה.'
  }

  if (action === 'reopen') {
    await handleReopenProject({ projectId }, { su })
    return 'הפרויקט נפתח מחדש בהצלחה.'
  }

  if (action === 'complete_manually') {
    await handleCompleteProject({ projectId }, { su })
    return 'הפרויקט סומן כהושלם בהצלחה.'
  }

  throw new Error(`Invalid action: ${action}`)
}

export const PROJECTS_WRITE_TOOLS = new Set(['update_project_stage'])
