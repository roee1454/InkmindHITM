import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The stage rule lives in the PocketBase hooks (pb_hooks/lib/project-stage.js), where it runs inside
// every save. The file is CommonJS for PocketBase's JS VM while this repo is an ES module package,
// so it is evaluated here the way PocketBase loads it: with a module/exports pair.
interface StageRule {
  STAGES: string[]
  deriveProjectStage: (
    project: { lostAt?: string; completedAt?: string; quoteSentAt?: string },
    appointments: { kind: string; status: string }[],
  ) => string
}
function loadHookLib<T>(relativePath: string): T {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  const commonJs = { exports: {} }
  new Function('module', 'exports', source)(commonJs, commonJs.exports)
  return commonJs.exports as T
}

const { STAGES, deriveProjectStage } = loadHookLib<StageRule>('../../../pocketbase/pb_hooks/lib/project-stage.js')

const none = {}
const consult = (status: string) => ({ kind: 'consultation', status })
const session = (status: string) => ({ kind: 'session', status })
const touchUp = (status: string) => ({ kind: 'touch_up', status })

describe('deriveProjectStage', () => {
  it.each([
    ['a bare inquiry', none, [], 'inquiry'],
    ['a booked consultation', none, [consult('pending')], 'consultation_scheduled'],
    ['a confirmed consultation', none, [consult('confirmed')], 'consultation_scheduled'],
    ['a finished consultation', none, [consult('completed')], 'consultation_done'],
    ['a quote after the consultation', { quoteSentAt: 'x' }, [consult('completed')], 'quoted'],
    ['a quote with a session still on hold', { quoteSentAt: 'x' }, [session('pending')], 'quoted'],
    ['a confirmed session', { quoteSentAt: 'x' }, [consult('completed'), session('confirmed')], 'booked'],
    ['a finished session with more to come', none, [session('completed'), session('confirmed')], 'in_progress'],
    ['a completed project', { completedAt: 'x' }, [session('completed')], 'completed'],
    ['a lost project, whatever happened before', { lostAt: 'x', completedAt: 'x' }, [session('completed')], 'lost'],
  ])('%s', (_name, project, appointments, expected) => {
    expect(deriveProjectStage(project, appointments)).toBe(expected)
  })

  it('moves back when the session that booked it is cancelled or missed', () => {
    expect(deriveProjectStage({ quoteSentAt: 'x' }, [session('cancelled')])).toBe('quoted')
    expect(deriveProjectStage(none, [consult('completed'), session('no_show')])).toBe('consultation_done')
    expect(deriveProjectStage(none, [consult('cancelled')])).toBe('inquiry')
  })

  it('ignores touch-ups', () => {
    expect(deriveProjectStage(none, [touchUp('confirmed')])).toBe('inquiry')
    expect(deriveProjectStage({ completedAt: 'x' }, [touchUp('completed')])).toBe('completed')
  })

  it('only ever returns a known stage', () => {
    expect(STAGES).toEqual(['inquiry', 'consultation_scheduled', 'consultation_done', 'quoted', 'booked', 'in_progress', 'completed', 'lost'])
  })
})
