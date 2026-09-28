import { describe, expect, it } from 'vitest'
import { projectBookingValues } from '@/features/projects/utils/booking'
import type { ProjectDetails } from '@/features/projects/types'

function project(overrides: Partial<ProjectDetails> = {}): ProjectDetails {
  return {
    id: 'p1', title: 'שרוול', stage: 'in_progress', stageChangedAt: null, lostReason: null, lostNote: null, quoteMin: 4500, quoteMax: 6000,
    estimatedSessions: 4, customer: { id: 'c1', name: 'דנה', phone: '+972521111111' }, canManage: true, timeline: [], otherProjects: [],
    reschedules: [], attachable: [], primaryStaffId: 'artist1', ...overrides,
  }
}

describe('projectBookingValues', () => {
  it('files the booking under the project, with its customer, artist and piece', () => {
    expect(projectBookingValues(project())).toMatchObject({
      projectId: 'p1', customerId: 'c1', leadName: 'דנה', leadPhone: '+972521111111', staffId: 'artist1', tattooDescription: 'שרוול',
    })
  })

  it('books a session of work under way as confirmed, without re-pricing it', () => {
    expect(projectBookingValues(project())).toMatchObject({ status: 'confirmed', priceMinIls: null, priceMaxIls: null })
  })

  it('carries the quote into the first session of a quoted piece', () => {
    expect(projectBookingValues(project({ stage: 'quoted' }))).toMatchObject({ status: 'pending', priceMinIls: 4500, priceMaxIls: 6000 })
  })
})
