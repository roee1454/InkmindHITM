import { describe, expect, it } from 'vitest'
import { pickActiveProject } from '@/features/projects/utils/active-project'
import type { PipelineProject, ProjectStage } from '@/features/projects/types'

function project(id: string, stage: ProjectStage, extra: Partial<PipelineProject> = {}): PipelineProject {
  return {
    projectId: id, title: id, stage, stageChangedAt: null, customerId: 'c1', customerName: null, customerPhone: '', source: null, conversationId: null,
    staffId: null, staffName: null, quoteMin: null, quoteMax: null, nextAppointmentAt: null, sessionsDone: 0, estimatedSessions: null,
    lastSessionAt: null, lostReason: null, lostNote: null, due: 0, credit: 0, ...extra,
  }
}

describe('pickActiveProject', () => {
  it('prefers the open project with the soonest upcoming appointment', () => {
    const active = pickActiveProject([
      project('later', 'booked', { nextAppointmentAt: '2026-11-01T10:00:00Z' }),
      project('fresh', 'inquiry', { stageChangedAt: '2026-09-28T10:00:00Z' }),
      project('soon', 'in_progress', { nextAppointmentAt: '2026-10-05T10:00:00Z' }),
    ])
    expect(active?.project.projectId).toBe('soon')
    expect(active?.otherOpen).toBe(2)
  })

  it('falls back to the project whose stage moved last', () => {
    const active = pickActiveProject([
      project('old', 'quoted', { stageChangedAt: '2026-08-01T10:00:00Z' }),
      project('new', 'inquiry', { stageChangedAt: '2026-09-27T10:00:00Z' }),
    ])
    expect(active?.project.projectId).toBe('new')
  })

  it('ignores completed and lost projects', () => {
    expect(pickActiveProject([project('done', 'completed', { nextAppointmentAt: '2026-10-05T10:00:00Z' }), project('gone', 'lost')])).toBeNull()
  })
})
