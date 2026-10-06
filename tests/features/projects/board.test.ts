import { describe, expect, it } from 'vitest'
import { CLOSED_COLUMNS, OPEN_COLUMNS, groupByColumn, projectAttention, projectCardFact, sortForColumn } from '@/features/projects/utils/board'
import { PROJECT_STAGES } from '@/features/projects/types'
import type { PipelineProject, ProjectStage } from '@/features/projects/types'

const now = new Date('2026-09-27T12:00:00Z')
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()

const project = (stage: ProjectStage, overrides: Partial<PipelineProject> = {}): PipelineProject =>
  ({
    projectId: `p-${stage}`,
    title: 'שרוול',
    stage,
    stageChangedAt: daysAgo(1),
    customerName: 'דנה',
    nextAppointmentAt: null,
    sessionsDone: 0,
    estimatedSessions: null,
    lastSessionAt: null,
    quoteMin: null,
    quoteMax: null,
    lostReason: null,
    due: 0,
    credit: 0,
    ...overrides,
  }) as PipelineProject

describe('board columns', () => {
  it('places every stage in exactly one column', () => {
    const all = [...OPEN_COLUMNS, ...CLOSED_COLUMNS].flatMap((c) => c.stages)
    expect([...all].sort()).toEqual([...PROJECT_STAGES].sort())
  })

  it('groups projects by column, keeping empty columns', () => {
    const grouped = groupByColumn([project('consultation_scheduled'), project('consultation_done'), project('quoted')], OPEN_COLUMNS)
    expect(grouped.get('consultation')).toHaveLength(2)
    expect(grouped.get('quoted')).toHaveLength(1)
    expect(grouped.get('inquiry')).toEqual([])
  })
})

describe('projectAttention', () => {
  it('flags money owed first, even on finished work', () => {
    expect(projectAttention(project('completed', { due: 500 }), now)).toBe('owes')
    expect(projectAttention(project('quoted', { due: 500, stageChangedAt: daysAgo(10) }), now)).toBe('owes')
  })

  it('never flags a lost project', () => {
    expect(projectAttention(project('lost', { due: 500 }), now)).toBeNull()
  })

  it('lets an inquiry or a quote go cold after three days', () => {
    expect(projectAttention(project('inquiry', { stageChangedAt: daysAgo(2) }), now)).toBeNull()
    expect(projectAttention(project('inquiry', { stageChangedAt: daysAgo(3) }), now)).toBe('stuck')
    expect(projectAttention(project('quoted', { stageChangedAt: daysAgo(4) }), now)).toBe('stuck')
  })

  it('gives a finished consultation a week before nudging', () => {
    expect(projectAttention(project('consultation_done', { stageChangedAt: daysAgo(6) }), now)).toBeNull()
    expect(projectAttention(project('consultation_done', { stageChangedAt: daysAgo(7) }), now)).toBe('stuck')
  })

  it('treats a booked stage as fine while something is actually booked', () => {
    expect(projectAttention(project('booked', { nextAppointmentAt: daysAgo(-3) }), now)).toBeNull()
    // The session's time passed and nobody closed it.
    expect(projectAttention(project('booked'), now)).toBe('stuck')
    expect(projectAttention(project('consultation_scheduled'), now)).toBe('stuck')
  })

  it('allows weeks of healing between sessions before calling the work stalled', () => {
    expect(projectAttention(project('in_progress', { lastSessionAt: daysAgo(21) }), now)).toBeNull()
    expect(projectAttention(project('in_progress', { lastSessionAt: daysAgo(30) }), now)).toBe('stuck')
    expect(projectAttention(project('in_progress', { lastSessionAt: daysAgo(60), nextAppointmentAt: daysAgo(-5) }), now)).toBeNull()
  })
})

describe('sortForColumn', () => {
  it('raises money owed, then stalled work, and keeps the rest in order', () => {
    const calm1 = project('quoted', { projectId: 'calm1' })
    const stuck = project('quoted', { projectId: 'stuck', stageChangedAt: daysAgo(5) })
    const calm2 = project('quoted', { projectId: 'calm2' })
    const owes = project('quoted', { projectId: 'owes', due: 300 })
    expect(sortForColumn([calm1, stuck, calm2, owes], now).map((p) => p.projectId)).toEqual(['owes', 'stuck', 'calm1', 'calm2'])
  })
})

describe('projectCardFact', () => {
  it('shows session progress against the artist estimate on work in progress', () => {
    expect(projectCardFact(project('in_progress', { sessionsDone: 2, estimatedSessions: 3 }), now)).toBe('2 מתוך \u2066~3\u2069 סשנים')
    expect(projectCardFact(project('in_progress', { sessionsDone: 1 }), now)).toBe('סשן אחד עד עכשיו')
  })

  it('says how long a quote or an inquiry has been waiting', () => {
    expect(projectCardFact(project('inquiry', { stageChangedAt: daysAgo(0) }), now)).toBe('פנייה היום')
    expect(projectCardFact(project('quoted', { stageChangedAt: daysAgo(4), quoteMin: 1200, quoteMax: 1200 }), now)).toMatch(/נשלחה לפני 4 ימים$/)
  })

  it('names what passed without being closed', () => {
    expect(projectCardFact(project('booked'), now)).toBe('סשן שעבר ולא נסגר')
  })

  it('gives the reason on a lost project', () => {
    expect(projectCardFact(project('lost', { lostReason: 'price' }), now)).toBe('אבוד · מחיר')
  })
})
