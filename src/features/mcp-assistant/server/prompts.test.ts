import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMcpSystemPrompt } from './prompts'

// Mirrors the convention in `src/integrations/ai/prompts.test.ts` — pure string-builder tests
// guarding against accidental deletion of specific rules/domains during a future prompt edit.
describe('buildMcpSystemPrompt', () => {
  const prompt = buildMcpSystemPrompt({ staffName: 'רועי' })

  it('addresses the staff member by name', () => {
    expect(prompt).toContain('רועי')
  })

  it('states the never-say-an-action-already-happened rule', () => {
    expect(prompt).toContain('לעולם אל תגידו ללקוח שפעולה "בוצעה"')
  })

  it('mentions the waitlist proactive-conversation behavior', () => {
    expect(prompt).toContain('רשימת המתנה')
    expect(prompt).toContain('offer_waitlist_slot')
    expect(prompt).toContain('record_waitlist_response')
  })
})

// Regression guard for the bug where the assistant computed its own (wrong) day-of-week — it
// once claimed 19.8.2026 was a Tuesday; it's actually a Wednesday. `buildMcpSystemPrompt` never
// grounded "today" at all before this fix, leaving the model to guess.
describe('buildMcpSystemPrompt — temporal grounding', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // A Wednesday, confirmed independently (not by mental arithmetic — that's the failure mode
    // this guards against): new Date(2026, 7, 19).getDay() === 3.
    vi.setSystemTime(new Date(2026, 7, 19, 12, 0, 0))
  })

  afterEach(() => vi.useRealTimers())

  it('states the correct day name for the current date, not a computed/guessed one', () => {
    const prompt = buildMcpSystemPrompt({ staffName: 'רועי' })
    expect(prompt).toContain('היום: 2026-08-19 (יום רביעי)')
    expect(prompt).not.toContain('יום שלישי')
  })

  it('carries the temporal block and its no-self-calculation instruction', () => {
    const prompt = buildMcpSystemPrompt({ staffName: 'רועי' })
    expect(prompt).toContain('[הקשר זמן')
    expect(prompt).toContain('אל תחשבו איזה יום בשבוע חל בתאריך')
  })
})
