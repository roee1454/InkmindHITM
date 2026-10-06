import { describe, expect, it } from 'vitest'
import { defaultProjectChoice } from '@/features/projects/utils/project-choice'

describe('defaultProjectChoice', () => {
  it('joins the one piece under way', () => {
    expect(defaultProjectChoice([{ id: 'p1', title: 'שרוול', stage: 'in_progress' }, { id: 'p2', title: 'פנייה', stage: 'inquiry' }])).toBe('p1')
  })

  it('opens a new project when nothing is under way', () => {
    expect(defaultProjectChoice([{ id: 'p2', title: 'פנייה', stage: 'inquiry' }])).toBeNull()
    expect(defaultProjectChoice([])).toBeNull()
  })

  it('lets staff choose when two pieces are under way, instead of guessing', () => {
    expect(defaultProjectChoice([{ id: 'p1', title: 'א', stage: 'in_progress' }, { id: 'p3', title: 'ב', stage: 'in_progress' }])).toBeNull()
  })
})
