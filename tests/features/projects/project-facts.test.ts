import { describe, expect, it } from 'vitest'
import { balanceFact } from '@/features/projects/components/project-panel/ProjectFacts'
import type { ProjectDetails } from '@/features/projects/types'
import type { PanelSummary } from '@/features/projects/utils/panel'
import type { ProjectFinance } from '@/features/payments/types'

function makeProject(overrides: Partial<ProjectDetails> = {}): ProjectDetails {
  return {
    id: 'p1',
    title: 'קעקוע זרוע',
    stage: 'booked',
    stageChangedAt: null,
    lostReason: null,
    lostNote: null,
    quoteMin: 1000,
    quoteMax: 1000,
    estimatedSessions: 1,
    customer: { id: 'c1', name: 'יוסי', phone: '0501234567' },
    canManage: true,
    timeline: [],
    otherProjects: [],
    reschedules: [],
    attachable: [],
    primaryStaffId: 'staff1',
    ...overrides,
  }
}

function makeSummary(overrides: Partial<PanelSummary> = {}): PanelSummary {
  return {
    appointments: [],
    sessionsDone: 0,
    next: null,
    ...overrides,
  }
}

function makeFinance(overrides: Partial<ProjectFinance['balance']> = {}): ProjectFinance {
  return {
    projectId: 'p1',
    title: 'קעקוע זרוע',
    appointments: [],
    payments: [],
    quoteMin: 1000,
    quoteMax: 1000,
    estimatedSessions: 1,
    depositApplication: 'first_session',
    balance: {
      billed: 0,
      paid: 0,
      refunded: 0,
      due: 0,
      credit: 0,
      ...overrides,
    },
  }
}

describe('balanceFact', () => {
  it('returns placeholder when finance is not loaded', () => {
    const fact = balanceFact(makeProject(), makeSummary(), undefined, false)
    expect(fact).toEqual({ label: 'יתרה', value: '…', locked: false })
  })

  it('shows יתרה לתשלום when due > 0', () => {
    const finance = makeFinance({ billed: 1000, paid: 200, due: 800, credit: 0 })
    const fact = balanceFact(makeProject(), makeSummary(), finance, false)
    expect(fact.label).toBe('יתרה לתשלום')
    expect(fact.value).toBe('₪800')
    expect(fact.hint).toBe('שולמו ₪200 מתוך ₪1,000')
    expect(fact.tone).toBe('text-warning')
  })

  it('shows ממתין לסגירה when a completed session has missing final price', () => {
    const summary = makeSummary({
      appointments: [
        {
          id: 'a1',
          kind: 'session',
          status: 'completed',
          date: '2026-10-01',
          timeSlot: '12:00',
          start: '2026-10-01T12:00:00',
          isNext: false,
          finalPrice: null,
          chargeWaived: false,
          movedFrom: null,
          projectPosition: null,
        },
      ],
    })
    const finance = makeFinance({ billed: 0, paid: 200, due: 0, credit: 200 })
    const fact = balanceFact(makeProject(), summary, finance, false)
    expect(fact.label).toBe('יתרה')
    expect(fact.value).toBe('ממתין לסגירה')
    expect(fact.hint).toBe('חסר מחיר סופי לסשן שהסתיים')
    expect(fact.tone).toBe('text-warning')
  })

  it('shows מקדמה שולמה when deposit is paid and an appointment is upcoming', () => {
    const summary = makeSummary({
      appointments: [
        {
          id: 'a1',
          kind: 'session',
          status: 'confirmed',
          date: '2026-10-15',
          timeSlot: '12:00',
          start: '2026-10-15T12:00:00',
          isNext: true,
          finalPrice: null,
          chargeWaived: false,
          movedFrom: null,
          projectPosition: null,
        },
      ],
    })
    const finance = makeFinance({ billed: 0, paid: 200, due: 0, credit: 200 })
    const fact = balanceFact(makeProject(), summary, finance, false)
    expect(fact.label).toBe('מקדמה שולמה')
    expect(fact.value).toBe('₪200')
    expect(fact.hint).toBe('משוריין לתור הבא')
    expect(fact.tone).toBe('text-status-done')
  })

  it('shows מקדמה שולמה with לתורים הבאים when multiple appointments are upcoming', () => {
    const summary = makeSummary({
      appointments: [
        {
          id: 'a1',
          kind: 'session',
          status: 'confirmed',
          date: '2026-10-15',
          timeSlot: '12:00',
          start: '2026-10-15T12:00:00',
          isNext: true,
          finalPrice: null,
          chargeWaived: false,
          movedFrom: null,
          projectPosition: null,
        },
        {
          id: 'a2',
          kind: 'session',
          status: 'pending',
          date: '2026-10-22',
          timeSlot: '12:00',
          start: '2026-10-22T12:00:00',
          isNext: false,
          finalPrice: null,
          chargeWaived: false,
          movedFrom: null,
          projectPosition: null,
        },
      ],
    })
    const finance = makeFinance({ billed: 0, paid: 400, due: 0, credit: 400 })
    const fact = balanceFact(makeProject(), summary, finance, false)
    expect(fact.label).toBe('מקדמה שולמה')
    expect(fact.value).toBe('₪400')
    expect(fact.hint).toBe('משוריין לתורים הבאים')
  })

  it('shows מאוזן for completed project even if billed was 0 but paid > 0', () => {
    const project = makeProject({ stage: 'completed' })
    const summary = makeSummary({ appointments: [] })
    const finance = makeFinance({ billed: 0, paid: 1000, due: 0, credit: 1000 })
    const fact = balanceFact(project, summary, finance, false)
    expect(fact.label).toBe('יתרה')
    expect(fact.value).toBe('מאוזן')
    expect(fact.hint).toBe('שולמו ₪1,000 במלואם')
    expect(fact.tone).toBe('text-status-done')
  })

  it('shows מאוזן when billed > 0 and fully paid', () => {
    const finance = makeFinance({ billed: 1000, paid: 1000, due: 0, credit: 0 })
    const fact = balanceFact(makeProject(), makeSummary(), finance, false)
    expect(fact.label).toBe('יתרה')
    expect(fact.value).toBe('מאוזן')
    expect(fact.hint).toBe('שולמו ₪1,000 במלואם')
    expect(fact.tone).toBe('text-status-done')
  })

  it('shows זיכוי ללקוח only when all appointments are completed and genuine surplus exists', () => {
    const summary = makeSummary({
      appointments: [
        {
          id: 'a1',
          kind: 'session',
          status: 'completed',
          date: '2026-10-01',
          timeSlot: '12:00',
          start: '2026-10-01T12:00:00',
          isNext: false,
          finalPrice: 800,
          chargeWaived: false,
          movedFrom: null,
          projectPosition: null,
        },
      ],
    })
    const finance = makeFinance({ billed: 800, paid: 1000, due: 0, credit: 200 })
    const fact = balanceFact(makeProject({ stage: 'in_progress' }), summary, finance, false)
    expect(fact.label).toBe('זיכוי ללקוח')
    expect(fact.value).toBe('₪200')
    expect(fact.hint).toBe('שולם מעבר למה שחויב')
  })

  it('shows ₪0 עוד לא חויב for new project with 0 billed and 0 paid', () => {
    const finance = makeFinance({ billed: 0, paid: 0, due: 0, credit: 0 })
    const fact = balanceFact(makeProject(), makeSummary(), finance, false)
    expect(fact.label).toBe('יתרה')
    expect(fact.value).toBe('₪0')
    expect(fact.hint).toBe('עוד לא חויב')
  })
})
