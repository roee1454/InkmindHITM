import { describe, expect, it } from 'vitest'
import { countByFilter, matchesStage } from '@/features/leads/utils/pipeline-filter'
import type { PipelineProject, ProjectStage } from '@/features/projects/types'

const project = (stage: ProjectStage) => ({ stage }) as PipelineProject

describe('pipeline filter', () => {
  it('treats every stage but completed and lost as open', () => {
    expect(matchesStage(project('quoted'), 'open')).toBe(true)
    expect(matchesStage(project('lost'), 'open')).toBe(false)
    expect(matchesStage(project('completed'), 'open')).toBe(false)
    expect(matchesStage(project('lost'), 'lost')).toBe(true)
    expect(matchesStage(project('lost'), 'no_project')).toBe(false)
  })

  it('counts each filter', () => {
    const counts = countByFilter([project('inquiry'), project('quoted'), project('lost'), project('quoted')], 3)
    expect(counts).toMatchObject({ open: 3, inquiry: 1, quoted: 2, lost: 1, completed: 0, no_project: 3 })
  })
})
