import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { loadPipeline as LoadPipeline } from '@/features/projects/server/pipeline.server'
import type { handleGetProjectDetails as HandleGetProjectDetails } from '@/features/projects/server/project-details.server'
import type {
  handleMarkProjectLost as HandleMarkProjectLost,
  handleReopenProject as HandleReopenProject,
  handleCompleteProject as HandleCompleteProject,
} from '@/features/projects/server/project-milestones.server'
import type {
  buildProjectsTools as BuildProjectsTools,
  commitProjectsAction as CommitProjectsAction,
} from '@/features/mcp-assistant/server/tool-servers/projects.server'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))
vi.mock('@/features/projects/server/pipeline.server', () => ({
  loadPipeline: vi.fn(),
}))
vi.mock('@/features/projects/server/project-details.server', () => ({
  handleGetProjectDetails: vi.fn(),
}))
vi.mock('@/features/projects/server/project-milestones.server', () => ({
  handleMarkProjectLost: vi.fn(),
  handleReopenProject: vi.fn(),
  handleCompleteProject: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let loadPipeline: typeof LoadPipeline
let handleGetProjectDetails: typeof HandleGetProjectDetails
let handleMarkProjectLost: typeof HandleMarkProjectLost
let handleReopenProject: typeof HandleReopenProject
let handleCompleteProject: typeof HandleCompleteProject
let buildProjectsTools: typeof BuildProjectsTools
let commitProjectsAction: typeof CommitProjectsAction

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ loadPipeline } = await import('@/features/projects/server/pipeline.server'))
  ;({ handleGetProjectDetails } = await import('@/features/projects/server/project-details.server'))
  ;({ handleMarkProjectLost, handleReopenProject, handleCompleteProject } = await import(
    '@/features/projects/server/project-milestones.server'
  ))
  ;({ buildProjectsTools, commitProjectsAction } = await import(
    '@/features/mcp-assistant/server/tool-servers/projects.server'
  ))
})

const createMockCtx = () => ({
  su: createFakePocketBase() as any,
  staff: { id: 'staff1', name: 'Alon', role: 'admin' } as any,
  conversationId: 'conv1',
  messageId: 'msg1',
  proposals: [] as any[],
})

const MOCK_PIPELINE = {
  projects: [
    {
      projectId: 'proj1',
      title: 'דרקון יפני',
      customerId: 'cust1',
      customerName: 'רועי כהן',
      customerPhone: '0501111111',
      stage: 'in_progress' as const,
      staffId: 'staff1',
      staffName: 'אלון',
      estimatedSessions: 3,
      sessionsDone: 1,
      quoteMin: 3000,
      quoteMax: 4000,
      due: 500,
      credit: 0,
      nextAppointmentAt: '2026-04-10T10:00:00Z',
      lostReason: null,
      lostNote: null,
    },
    {
      projectId: 'proj2',
      title: 'פרח לוטוס',
      customerId: 'cust2',
      customerName: 'דנה לוי',
      customerPhone: '0522222222',
      stage: 'booked' as const,
      staffId: 'staff2',
      staffName: 'שירה',
      estimatedSessions: 1,
      sessionsDone: 0,
      quoteMin: 800,
      quoteMax: 1000,
      due: 0,
      credit: 200,
      nextAppointmentAt: '2026-04-12T14:00:00Z',
      lostReason: null,
      lostNote: null,
    },
    {
      projectId: 'proj3',
      title: 'צמיד גיאומטרי',
      customerId: 'cust3',
      customerName: 'נועה',
      customerPhone: '0543333333',
      stage: 'lost' as const,
      staffId: 'staff1',
      staffName: 'אלון',
      estimatedSessions: 1,
      sessionsDone: 0,
      quoteMin: null,
      quoteMax: null,
      due: 0,
      credit: 0,
      nextAppointmentAt: null,
      lostReason: 'price_too_high' as const,
      lostNote: 'יקר לה מדי',
    },
  ],
  totals: {} as any,
  byStage: {} as any,
}

describe('search_projects', () => {
  beforeEach(() => {
    vi.mocked(getSuperuserClient).mockResolvedValue(createFakePocketBase() as never)
    vi.mocked(loadPipeline).mockResolvedValue(MOCK_PIPELINE as never)
  })

  it('returns all projects when no query is passed', async () => {
    const tools = buildProjectsTools(createMockCtx())
    const result = (await (tools.search_projects as any).execute({})) as {
      status: string
      data: Array<{ projectId: string; title: string }>
    }
    expect(result.status).toBe('success')
    expect(result.data).toHaveLength(3)
  })

  it('filters by customer name query', async () => {
    const tools = buildProjectsTools(createMockCtx())
    const result = (await (tools.search_projects as any).execute({ query: 'רועי' })) as {
      status: string
      data: Array<{ customerName: string }>
    }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.customerName).toBe('רועי כהן')
  })

  it('filters by title query', async () => {
    const tools = buildProjectsTools(createMockCtx())
    const result = (await (tools.search_projects as any).execute({ query: 'לוטוס' })) as {
      status: string
      data: Array<{ title: string }>
    }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.title).toBe('פרח לוטוס')
  })

  it('filters by stage', async () => {
    const tools = buildProjectsTools(createMockCtx())
    const result = (await (tools.search_projects as any).execute({ stage: 'in_progress' })) as {
      status: string
      data: Array<{ stage: string }>
    }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.stage).toBe('in_progress')
  })

  it('filters by staffId', async () => {
    const tools = buildProjectsTools(createMockCtx())
    const result = (await (tools.search_projects as any).execute({ staffId: 'staff2' })) as {
      status: string
      data: Array<{ artistName: string }>
    }
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.artistName).toBe('שירה')
  })
})

describe('get_project', () => {
  it('returns full project details including timeline', async () => {
    const tools = buildProjectsTools(createMockCtx())
    vi.mocked(handleGetProjectDetails).mockResolvedValue({
      id: 'proj1',
      title: 'דרקון יפני',
      stage: 'in_progress',
      customer: { id: 'cust1', name: 'רועי כהן', phone: '0501111111' },
      quoteMin: 3000,
      quoteMax: 4000,
      estimatedSessions: 3,
      lostReason: null,
      lostNote: null,
      timeline: [
        {
          id: 'appt1',
          kind: 'session',
          status: 'completed',
          date: '2026-03-01',
          timeSlot: '10:00',
          projectPosition: { sessionNumber: 1 },
        },
      ],
    } as any)

    const result = (await (tools.get_project as any).execute({ projectId: 'proj1' })) as {
      status: string
      data: { id: string; title: string; timeline: Array<{ kindLabel: string }> }
    }

    expect(result.status).toBe('success')
    expect(result.data.id).toBe('proj1')
    expect(result.data.timeline[0]?.kindLabel).toBe('סשן קעקוע')
  })

  it('returns error status if project lookup fails', async () => {
    const tools = buildProjectsTools(createMockCtx())
    vi.mocked(handleGetProjectDetails).mockRejectedValue(new Error('Project not found'))

    const result = (await (tools.get_project as any).execute({ projectId: 'proj_none' })) as {
      status: string
      message: string
    }

    expect(result.status).toBe('error')
    expect(result.message).toContain('Project not found')
  })
})

describe('update_project_stage (write tool & diff)', () => {
  it('requires reason when action is mark_lost', async () => {
    const su = createFakePocketBase()
    su._seed('projects', [{ id: 'proj1', title: 'דרקון', stage: 'in_progress', customer: 'cust1' }])
    su._seed('customers', [{ id: 'cust1', name: 'רועי' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const tools = buildProjectsTools(createMockCtx())
    const res = (await (tools.update_project_stage as any).execute({
      projectId: 'proj1',
      action: 'mark_lost',
    })) as { status: string; message: string }

    expect(res.status).toBe('error')
    expect(res.message).toContain('יש לציין סיבת אובדן')
  })

  it('generates a diff with summary and action description for reopen', async () => {
    const su = createFakePocketBase()
    su._seed('projects', [{ id: 'proj1', title: 'דרקון', stage: 'lost', customer: 'cust1' }])
    su._seed('customers', [{ id: 'cust1', name: 'רועי' }])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const ctx = createMockCtx()
    const tools = buildProjectsTools(ctx)
    const res = (await (tools.update_project_stage as any).execute({
      projectId: 'proj1',
      action: 'reopen',
      note: 'הלקוח פנה שוב',
    })) as { status: string; message: string }

    expect(res.status).toBe('pending_approval')
    expect(ctx.proposals).toHaveLength(1)
    const diff = ctx.proposals[0].diff
    expect(diff.summary).toContain('עדכון שלב פרויקט')
    expect(diff.rows).toHaveLength(2)
    expect(diff.rows[0]).toMatchObject({ label: 'פעולה', after: 'פתיחה מחדש' })
    expect(diff.rows[1]).toMatchObject({ label: 'הערה', after: 'הלקוח פנה שוב' })
  })
})

describe('commitProjectsAction', () => {
  beforeEach(() => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)
  })

  it('calls handleMarkProjectLost on mark_lost action', async () => {
    vi.mocked(handleMarkProjectLost).mockResolvedValue({} as never)

    const msg = await commitProjectsAction('update_project_stage', {
      projectId: 'proj1',
      action: 'mark_lost',
      reason: 'price_too_high',
      note: 'יקר',
    })

    expect(handleMarkProjectLost).toHaveBeenCalledWith(
      { projectId: 'proj1', reason: 'price_too_high', note: 'יקר' },
      expect.anything(),
    )
    expect(msg).toContain('סומן כאבוד')
  })

  it('calls handleReopenProject on reopen action', async () => {
    vi.mocked(handleReopenProject).mockResolvedValue({} as never)

    const msg = await commitProjectsAction('update_project_stage', {
      projectId: 'proj1',
      action: 'reopen',
    })

    expect(handleReopenProject).toHaveBeenCalledWith({ projectId: 'proj1' }, expect.anything())
    expect(msg).toContain('נפתח מחדש')
  })

  it('calls handleCompleteProject on complete_manually action', async () => {
    vi.mocked(handleCompleteProject).mockResolvedValue({} as never)

    const msg = await commitProjectsAction('update_project_stage', {
      projectId: 'proj1',
      action: 'complete_manually',
    })

    expect(handleCompleteProject).toHaveBeenCalledWith({ projectId: 'proj1' }, expect.anything())
    expect(msg).toContain('סומן כהושלם')
  })

  it('throws on unknown toolName', async () => {
    await expect(commitProjectsAction('unknown_tool', {})).rejects.toThrow('Unknown projects action')
  })
})
