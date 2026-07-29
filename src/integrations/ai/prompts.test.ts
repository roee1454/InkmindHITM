/**
 * Guards the two prompt regressions that produced robotic Hebrew (LANG-2, LANG-3):
 * competing length budgets, and formal-plural register leaking back into instructions.
 * JS `\b` is ASCII-only, so Hebrew "whole word" matching uses lookarounds on the
 * Hebrew letter range instead.
 */
import { describe, expect, it } from 'vitest'
import {
  buildStaticSystemPrompt,
  buildDynamicSystemPrompt,
  STATE_TOOLS,
  STAFF_MESSAGE_TAG,
} from './prompts'
import type { ConversationState } from './prompts'

const ALL_STATES = Object.keys(STATE_TOOLS) as ConversationState[]

const buildAll = (): Array<[string, string]> => [
  ...ALL_STATES.map(
    (state): [string, string] => [state, buildStaticSystemPrompt({ state, isEscalated: false })],
  ),
  ['escalated:generic', buildStaticSystemPrompt({ state: 'AWAIT_PAYMENT', isEscalated: true, staffCallReason: 'receipt_verification' })],
  ['escalated:artist', buildStaticSystemPrompt({ state: 'COLLECTING_INFO', isEscalated: true, staffCallReason: 'artist_assignment' })],
  ['escalated:reschedule', buildStaticSystemPrompt({ state: 'AWAITING_APPOINTMENT', isEscalated: true, staffCallReason: 'reschedule_request' })],
]

/** Whole-word Hebrew match: the term not embedded inside a longer Hebrew word
 *  (so "שאלו" flags, but "לשאלות" doesn't). */
const hebrewWord = (term: string) => new RegExp(`(?<![א-ת])${term}(?![א-ת])`)

// High-signal formal-plural imperatives from the pre-rewrite prompt. The model imitates
// the register it reads, so any of these leaking back in re-robotizes the bot's Hebrew.
const PLURAL_IMPERATIVES = ['שאלו', 'קראו', 'הציגו', 'בדקו', 'ציינו', 'הסבירו', 'בקשו', 'סרבו', 'הודיעו', 'התעלמו', 'הזהירו']

// Mixed-gender slash forms ("קרא/י") — the persona is a single masculine voice.
const SLASH_FORMS = /(קרא|שאל|הצע|ענ|הישאר|תגיד|בדוק)\/י|את\/ה/

describe('prompt register (LANG-3)', () => {
  for (const [name, prompt] of buildAll()) {
    it(`${name}: no formal-plural imperatives`, () => {
      for (const term of PLURAL_IMPERATIVES) {
        expect(prompt).not.toMatch(hebrewWord(term))
      }
    })
    it(`${name}: no mixed-gender slash forms`, () => {
      expect(prompt).not.toMatch(SLASH_FORMS)
    })
  }
})

describe('length budget (LANG-2)', () => {
  for (const [name, prompt] of buildAll()) {
    it(`${name}: exactly one word-count budget, in the persona block`, () => {
      expect(prompt.match(/25 מילים/g)).toHaveLength(1)
      // The old competing budget must never come back.
      expect(prompt).not.toMatch(/30-40|40 מילים/)
    })
  }
})

describe('prompt assembly integrity', () => {
  it('every state builds with base rules, persona, and the anti-forgery tag', () => {
    for (const state of ALL_STATES) {
      const prompt = buildStaticSystemPrompt({ state, isEscalated: false })
      expect(prompt).toContain('<system_rules>')
      expect(prompt).toContain('<whatsapp_persona>')
      expect(prompt).toContain(STAFF_MESSAGE_TAG)
    }
  })

  it('custom studio instructions are appended when present', () => {
    const prompt = buildStaticSystemPrompt({
      state: 'NEW',
      isEscalated: false,
      customInstructions: 'סגורים בחגים',
    })
    expect(prompt).toContain('[הנחיות נוספות מהסטודיו]')
    expect(prompt).toContain('סגורים בחגים')
  })

  it('dynamic prompt carries the temporal block and the spoken-date rule (LANG-4)', () => {
    const dynamic = buildDynamicSystemPrompt({})
    expect(dynamic).toContain('[הקשר זמן')
    expect(dynamic).toContain('איך אומרים תאריך ללקוח')
  })
})
