import { describe, it, expect } from 'vitest'
import { extractMedicalAlerts, buildQuestionAnswerList } from '@/features/health-declaration/utils/health-alerts'

describe('health-alerts utils', () => {
  it('identifies no alerts when all responses are negative or clean', () => {
    const answers = {
      'שם מלא': 'רואי חיילי',
      'האם אתה סובל מאחת מהבעיות הרפואיות הבאות?': ['אין מן האמור לעיל'],
      'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?': 'לא',
      'האם את בהריון או תקופת הנקה?': 'לא',
      'האם השתמשת באלכוהול או בסמים ב-24 השעות האחרונות?': 'לא',
    }
    const alerts = extractMedicalAlerts({ answers })
    expect(alerts).toHaveLength(0)
  })

  it('identifies critical alerts for blood thinners and alcohol/drugs', () => {
    const answers = {
      'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?': 'אספירין 100 מ"ג',
      'האם השתמשת באלכוהול או בסמים ב-24 השעות האחרונות?': 'כן, בירה אתמול בערב',
    }
    const alerts = extractMedicalAlerts({ answers })
    expect(alerts).toHaveLength(2)
    expect(alerts.map((a) => a.id)).toContain('medications')
    expect(alerts.map((a) => a.id)).toContain('substances')
    expect(alerts[0]?.severity).toBe('danger')
  })

  it('identifies medical conditions and allergies', () => {
    const answers = {
      'האם אתה סובל מאחת מהבעיות הרפואיות הבאות?': ['סוכרת', 'אפילפסיה'],
    }
    const alerts = extractMedicalAlerts({
      answers,
      allergies: 'לטקס, ניקל',
    })
    expect(alerts).toHaveLength(2)
    expect(alerts.find((a) => a.id === 'allergies')?.detail).toBe('לטקס, ניקל')
    expect(alerts.find((a) => a.id === 'medical_conditions')?.detail).toBe('סוכרת, אפילפסיה')
  })

  it('parses fallback medicalNotes string if answers object is missing', () => {
    const medicalNotes = `האם אתה נוטל תדרויות באופן קבוע או מדללי דם?: קומדין\nהאם אתה סובל מאחת מהבעיות הרפואיות הבאות?: אין מן האמור לעיל`
    const alerts = extractMedicalAlerts({ medicalNotes })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.id).toBe('medications')
    expect(alerts[0]?.detail).toBe('קומדין')
  })

  it('builds clean Q&A list excluding metadata and marking alerts', () => {
    const answers = {
      'שם מלא': 'ישראל ישראלי',
      timestamp: '2026-09-22T15:38:06.232Z',
      form_url: 'https://docs.google.com/...',
      'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?': 'אספירין',
      'האם את בהריון או תקופת הנקה?': 'לא',
    }
    const list = buildQuestionAnswerList({ answers })
    expect(list).toHaveLength(3)
    expect(list.find((item) => item.question === 'timestamp')).toBeUndefined()
    expect(list.find((item) => item.question.includes('תדרויות'))?.isAlert).toBe(true)
    expect(list.find((item) => item.question.includes('הריון'))?.isAlert).toBe(false)
  })

  it('preserves exact webhook arrival order using answers._order', () => {
    const answers = {
      'חתימה דיגיטלית או אישור הצהרה': 'רואי חיילי',
      'שם מלא': 'רואי חיילי',
      'תעודת זהות': '214650590',
      'מספר טלפון נייד': '0527051611',
      _order: [
        'שם מלא',
        'תעודת זהות',
        'מספר טלפון נייד',
        'חתימה דיגיטלית או אישור הצהרה',
      ],
    }
    const list = buildQuestionAnswerList({ answers })
    expect(list.map((item) => item.question)).toEqual([
      'שם מלא',
      'תעודת זהות',
      'מספר טלפון נייד',
      'חתימה דיגיטלית או אישור הצהרה',
    ])
    expect(list.find((item) => item.question === '_order')).toBeUndefined()
  })

  it('orders questions canonically when _order is absent', () => {
    const answers = {
      'חתימה דיגיטלית או אישור הצהרה': 'ישראל ישראלי',
      'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?': 'לא',
      'שם מלא': 'ישראל ישראלי',
      'תעודת זהות': '123456789',
    }
    const list = buildQuestionAnswerList({ answers })
    expect(list.map((item) => item.question)).toEqual([
      'שם מלא',
      'תעודת זהות',
      'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?',
      'חתימה דיגיטלית או אישור הצהרה',
    ])
  })
})
