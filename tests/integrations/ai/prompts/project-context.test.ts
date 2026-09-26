import { describe, expect, it } from 'vitest'
import { buildProjectContextBlock, toProjectPromptContext } from '@/integrations/ai/prompts/project-context'
import type { ProjectContextSource } from '@/integrations/ai/prompts/project-context'
import type { LedgerAppointment, LedgerPayment } from '@/features/payments/types'

const now = new Date('2026-10-01T12:00:00')

const appt = (id: string, kind: LedgerAppointment['kind'], status: LedgerAppointment['status'], startTime: string): LedgerAppointment => ({
  id,
  kind,
  status,
  startTime,
  finalPrice: status === 'completed' ? 1200 : null,
  chargeWaived: false,
})
const deposit = (amount: number, status: LedgerPayment['status'] = 'verified'): LedgerPayment => ({
  id: `p${amount}`,
  appointmentId: null,
  kind: 'deposit',
  method: 'bit',
  amount,
  status,
  receivedAt: null,
})

const source = (overrides: Partial<ProjectContextSource> = {}): ProjectContextSource => ({
  title: 'שרוול יפני',
  stage: 'in_progress',
  estimatedSessions: 3,
  quoteMin: 1200,
  quoteMax: 1500,
  appointments: [appt('s1', 'session', 'completed', '2026-09-20T10:00:00')],
  payments: [deposit(300)],
  balance: { billed: 1200, paid: 300, refunded: 0, due: 900, credit: 0 },
  healingPeriodDays: 21,
  touchUp: { kind: 'undecided' },
  ...overrides,
})

const block = (overrides: Partial<ProjectContextSource> = {}) => buildProjectContextBlock(toProjectPromptContext(source(overrides), now), now)

describe('the project context the bot reads', () => {
  it('says how far the work is, against the artist estimate, and prices per session', () => {
    const text = block()
    expect(text).toContain('- עבודה: "שרוול יפני" (שלב: ')
    expect(text).toContain('הושלמו 1 סשנים מתוך כ-3 (הערכת האמן)')
    expect(text).toContain('מחיר משוער לכל מפגש: ₪1,200–1,500.')
  })

  it('recommends when to book the next session, after healing, when nothing is booked', () => {
    expect(block()).toContain('מומלץ לקבוע מ-2026-10-11 והלאה, אחרי החלמה של כ-3 שבועות.')
    const healed = block({ appointments: [appt('s1', 'session', 'completed', '2026-09-01T10:00:00')] })
    expect(healed).toContain('ההחלמה המומלצת (כ-3 שבועות) כבר עברה. אפשר לקבוע.')
  })

  it('tells the bot the next session is already booked, so it does not offer to book it again', () => {
    const text = block({ appointments: [appt('s1', 'session', 'completed', '2026-09-20T10:00:00'), appt('s2', 'session', 'confirmed', '2026-10-15T11:00:00')] })
    expect(text).toContain('הסשן הבא כבר נקבע: 2026-10-15 בשעה 11:00. אל תציע לקבוע אותו שוב.')
    expect(text).not.toContain('מומלץ לקבוע')
  })

  it('never lets the bot guess the number of sessions when the artist has not set it', () => {
    const text = block({ estimatedSessions: null })
    expect(text).toContain('האמן עוד לא קבע כמה מפגשים העבודה תדרוש: אל תנחש')
    expect(text).toContain('מחיר משוער: ₪1,200–1,500.')
  })

  it('states the money only from the ledger: verified deposits and the balance', () => {
    const text = block({ payments: [deposit(300), deposit(500, 'pending_verification')] })
    expect(text).toContain('המקדמה ששולמה (₪300) רשומה ותקוזז מהתשלום על העבודה.')
    expect(text).toContain('יתרה לתשלום על סשנים שהסתיימו: ₪900.')
    expect(text).toContain('אל תחשב יתרות')
  })

  it('mentions touch-ups only once the studio decided the policy', () => {
    expect(block()).not.toContain("טאץ'-אפ")
    expect(block({ touchUp: { kind: 'free_within_days', days: 30 } })).toContain("טאץ'-אפ: ללא עלות עד 30 ימים מסיום העבודה.")
  })

  it('keeps the decisions with the artist', () => {
    expect(block()).toContain('מספר המפגשים וסיום העבודה נקבעים על ידי האמן בלבד')
  })

  it('adds nothing when the conversation has no project', () => {
    expect(buildProjectContextBlock(null, now)).toBe('')
  })
})
