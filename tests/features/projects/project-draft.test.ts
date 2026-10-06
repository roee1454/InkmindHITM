import { describe, expect, it } from 'vitest'
import { draftFrom, isDraftDirty, parseDraft } from '@/features/projects/utils/project-draft'

const saved = { title: 'שרוול', quoteMin: 4500, quoteMax: 6000, estimatedSessions: 4 }

describe('project draft', () => {
  it('starts from the saved values and is clean until something changes', () => {
    const draft = draftFrom(saved)
    expect(draft).toEqual({ title: 'שרוול', quoteMin: '4500', quoteMax: '6000', sessions: '4' })
    expect(isDraftDirty(draft, saved)).toBe(false)
    expect(isDraftDirty({ ...draft, title: 'שרוול ' }, saved)).toBe(false)
    expect(isDraftDirty({ ...draft, quoteMax: '6500' }, saved)).toBe(true)
  })

  it('parses empty fields as "not set"', () => {
    expect(parseDraft({ title: ' ורד ', quoteMin: '', quoteMax: '800', sessions: '' })).toEqual({
      ok: true,
      values: { title: 'ורד', quoteMin: null, quoteMax: 800, estimatedSessions: null },
    })
  })

  it('names the field that is wrong', () => {
    expect(parseDraft({ ...draftFrom(saved), title: '  ' })).toMatchObject({ ok: false, field: 'title' })
    expect(parseDraft({ ...draftFrom(saved), quoteMin: '-5' })).toMatchObject({ ok: false, field: 'quoteMin' })
    expect(parseDraft({ ...draftFrom(saved), quoteMin: '7000' })).toMatchObject({ ok: false, field: 'quoteMax' })
    expect(parseDraft({ ...draftFrom(saved), sessions: '2.5' })).toMatchObject({ ok: false, field: 'sessions' })
    expect(parseDraft({ ...draftFrom(saved), sessions: '80' })).toMatchObject({ ok: false, field: 'sessions' })
  })
})
