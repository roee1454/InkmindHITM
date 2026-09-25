export type HealthDeclarationAnswers = Record<string, string | number | boolean | null | string[]>

export interface MedicalAlert {
  id: string
  label: string
  detail?: string
  severity: 'danger' | 'warning' | 'info'
}

export interface QuestionAnswerItem {
  question: string
  answer: string
  isAlert?: boolean
}

const NEGATIVE_VALUES = new Set([
  'לא',
  'אין',
  'אין מן האמור לעיל',
  'none',
  'no',
  'false',
  'n/a',
  '-',
  'אין משהו מיוחד',
  'אין אלרגיות',
  'ללא',
])

function isNegative(val: unknown): boolean {
  if (val == null) return true
  if (typeof val === 'boolean') return !val
  if (Array.isArray(val)) {
    if (val.length === 0) return true
    return val.every((item) => isNegative(item))
  }
  const clean = String(val).trim().toLowerCase()
  return clean === '' || NEGATIVE_VALUES.has(clean)
}

function formatValue(val: unknown): string {
  if (val == null) return ''
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean).join(', ')
  }
  return String(val).trim()
}

/**
 * Extracts critical medical alerts from answers, medical notes, or allergies.
 * Pure deterministic domain function.
 */
export function extractMedicalAlerts(params: {
  answers?: Record<string, unknown> | null
  medicalNotes?: string | null
  allergies?: string | null
}): MedicalAlert[] {
  const alerts: MedicalAlert[] = []
  const answers = params.answers || {}

  // 1. Check direct allergies
  if (params.allergies && !isNegative(params.allergies)) {
    alerts.push({
      id: 'allergies',
      label: 'אלרגיות ידועות',
      detail: params.allergies.trim(),
      severity: 'warning',
    })
  }

  // 2. Iterate through answers to find specific medical concerns
  for (const [key, value] of Object.entries(answers)) {
    if (isNegative(value)) continue

    const formatted = formatValue(value)
    const keyLower = key.toLowerCase()

    // Blood thinners / medications
    if (key.includes('תרופות') || key.includes('תדרויות') || key.includes('מדללי דם') || keyLower.includes('medication')) {
      alerts.push({
        id: 'medications',
        label: 'נוטל תרופות קבועות / מדללי דם',
        detail: formatted,
        severity: 'danger',
      })
      continue
    }

    // Alcohol or drugs in last 24h
    if (key.includes('אלכוהול') || key.includes('סמים') || key.includes('24') || keyLower.includes('alcohol') || keyLower.includes('drug')) {
      alerts.push({
        id: 'substances',
        label: 'שימוש באלכוהול או סמים ב-24 שעות האחרונות',
        detail: formatted,
        severity: 'danger',
      })
      continue
    }

    // Pregnancy / nursing
    if (key.includes('הריון') || key.includes('הנקה') || keyLower.includes('pregnant') || keyLower.includes('nursing')) {
      alerts.push({
        id: 'pregnancy',
        label: 'הריון או תקופת הנקה',
        detail: formatted,
        severity: 'danger',
      })
      continue
    }

    // Medical conditions
    if (key.includes('בעיות הרפואיות') || key.includes('מצב רפואי') || keyLower.includes('condition') || keyLower.includes('medical')) {
      alerts.push({
        id: 'medical_conditions',
        label: 'בעיות רפואיות שדווחו',
        detail: formatted,
        severity: 'warning',
      })
      continue
    }

    // Allergies question if inside answers
    if (key.includes('אלרגיה') || key.includes('אלרגיות') || keyLower.includes('allerg')) {
      if (!alerts.some((a) => a.id === 'allergies')) {
        alerts.push({
          id: 'allergies',
          label: 'אלרגיות מדווחות',
          detail: formatted,
          severity: 'warning',
        })
      }
      continue
    }
  }

  // Fallback: If no answers object was available, parse medicalNotes lines
  if (alerts.length === 0 && params.medicalNotes) {
    const lines = params.medicalNotes.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const q = line.slice(0, colonIdx).trim()
      const a = line.slice(colonIdx + 1).trim()

      if (isNegative(a)) continue

      if (q.includes('תרופות') || q.includes('מדללי דם')) {
        alerts.push({ id: 'medications', label: 'נוטל תרופות קבועות / מדללי דם', detail: a, severity: 'danger' })
      } else if (q.includes('אלכוהול') || q.includes('סמים')) {
        alerts.push({ id: 'substances', label: 'שימוש באלכוהול או סמים ב-24 שעות האחרונות', detail: a, severity: 'danger' })
      } else if (q.includes('הריון') || q.includes('הנקה')) {
        alerts.push({ id: 'pregnancy', label: 'הריון או תקופת הנקה', detail: a, severity: 'danger' })
      } else if (q.includes('בעיות הרפואיות')) {
        alerts.push({ id: 'medical_conditions', label: 'בעיות רפואיות שדווחו', detail: a, severity: 'warning' })
      }
    }
  }

  return alerts
}

/**
 * Builds a clean list of questions and answers for display in the UI.
 */
export function buildQuestionAnswerList(params: {
  answers?: Record<string, unknown> | null
  medicalNotes?: string | null
}): QuestionAnswerItem[] {
  const result: QuestionAnswerItem[] = []
  const answers = params.answers || {}

  // Metadata keys to exclude from display
  const ignoredKeys = new Set([
    'timestamp',
    'form_response_id',
    'form_url',
    'formresponseid',
    'formurl',
    '_order',
    'rawanswers',
    'termsaccepted',
    'ageconfirmed',
  ])

  // If we have structured answers
  for (const [key, value] of Object.entries(answers)) {
    if (ignoredKeys.has(key.toLowerCase().trim())) continue
    const formatted = formatValue(value)
    if (!formatted) continue

    const negative = isNegative(value)
    const isAlert =
      !negative &&
      (key.includes('תרופות') ||
        key.includes('תדרויות') ||
        key.includes('מדללי דם') ||
        key.includes('סמים') ||
        key.includes('אלכוהול') ||
        key.includes('הריון') ||
        key.includes('הנקה') ||
        key.includes('בעיות') ||
        key.includes('אלרג'))

    result.push({
      question: key,
      answer: formatted,
      isAlert,
    })
  }

  // If no answers object, parse medicalNotes lines
  if (result.length === 0 && params.medicalNotes) {
    const lines = params.medicalNotes.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) {
        result.push({ question: 'הערה', answer: line })
      } else {
        const q = line.slice(0, colonIdx).trim()
        const a = line.slice(colonIdx + 1).trim()
        const negative = isNegative(a)
        const isAlert =
          !negative &&
          (q.includes('תרופות') ||
            q.includes('תדרויות') ||
            q.includes('מדללי דם') ||
            q.includes('סמים') ||
            q.includes('אלכוהול') ||
            q.includes('הריון') ||
            q.includes('הנקה') ||
            q.includes('בעיות') ||
            q.includes('אלרג'))
        result.push({
          question: q,
          answer: a,
          isAlert,
        })
      }
    }
  }

  // Sort questions to guarantee exact webhook arrival order or canonical studio order
  const explicitOrder = Array.isArray(answers._order)
    ? (answers._order as string[])
    : null

  if (explicitOrder) {
    result.sort((a, b) => {
      const idxA = explicitOrder.indexOf(a.question)
      const idxB = explicitOrder.indexOf(b.question)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return 0
    })
  } else {
    const CANONICAL_PATTERNS = [
      ['שם מלא', 'שם', 'name', 'full_name'],
      ['תעודת זהות', 'ת.ז', 'ת"ז', 'idnumber', 'id_number'],
      ['מספר טלפון נייד', 'טלפון', 'נייד', 'phone'],
      ['תאריך לידה', 'תאריך', 'birthdate', 'birth_date', 'dob'],
      ['סובל מאחת מהבעיות', 'בעיות רפואיות', 'medical_conditions', 'conditions'],
      ['תרופות', 'תדרויות', 'מדללי דם', 'medications'],
      ['הריון', 'הנקה', 'pregnant', 'nursing'],
      ['אלכוהול', 'סמים', '24 שעות', 'alcohol', 'drugs'],
      ['אלרגיה', 'אלרגיות', 'allergies'],
    ]

    const getScore = (question: string): number => {
      const lower = question.toLowerCase()
      if (lower.includes('חתימה') || lower.includes('אישור הצהרה') || lower.includes('signature')) {
        return 999
      }
      for (let i = 0; i < CANONICAL_PATTERNS.length; i++) {
        const patterns = CANONICAL_PATTERNS[i]
        if (patterns && patterns.some((pattern) => lower.includes(pattern))) {
          return i
        }
      }
      return 100 // Custom unknown questions placed between standard questions and signature
    }

    result.sort((a, b) => getScore(a.question) - getScore(b.question))
  }

  return result
}
