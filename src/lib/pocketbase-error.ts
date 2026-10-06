import { ClientResponseError } from 'pocketbase'
import { stripErrorCode } from './stale-reference'

const FIELD_LABELS: Record<string, string> = {
  phone: 'מספר טלפון',
  email: 'כתובת אימייל',
  name: 'שם',
  customer: 'לקוח',
  staff: 'איש צוות',
  start_time: 'מועד התור',
  duration_minutes: 'משך התור',
  duration_hours: 'משך התור',
  deposit_amount: 'סכום מקדמה',
  price_min: 'מחיר מינימום',
  price_max: 'מחיר מקסימום',
  price_amount: 'מחיר',
  status: 'סטטוס',
  role: 'תפקיד',
  work_hours: 'שעות פעילות',
  date: 'תאריך',
  time_slot: 'שעה',
  password: 'סיסמה',
  passwordConfirm: 'אימות סיסמה',
  whatsapp_chat_id: 'מזהה צ\'אט וואטסאפ',
  notes: 'הערות',
}

const CODE_MESSAGES: Record<string, string> = {
  validation_not_unique: 'כבר קיים במערכת (חייב להיות ייחודי)',
  validation_required: 'הינו שדה חובה',
  validation_is_email: 'אינו כתובת אימייל תקינה',
  validation_is_url: 'אינו קישור אינטרנט תקין',
  validation_min_length: 'קצר מדי מהנדרש',
  validation_max_length: 'ארוך מדי מהמותר',
  validation_invalid_phone: 'מספר טלפון אינו תקין',
  relation_record_not_found: 'הרשומה המקושרת אינה קיימת במערכת',
}

/**
 * Parses and translates PocketBase errors, SQLite constraint errors, and generic errors
 * into human-friendly, localized Hebrew explanations.
 */
export function formatDatabaseError(err: unknown, fallback = 'הפעולה נכשלה. נסה שוב מאוחר יותר.'): string {
  if (!err) return fallback

  // Extract from PocketBase ClientResponseError
  if (err instanceof ClientResponseError || (typeof err === 'object' && err !== null && 'status' in err && 'data' in err)) {
    const pbErr = err as {
      status?: number
      message?: string
      data?: {
        message?: string
        data?: Record<string, { code?: string; message?: string } | string>
      }
      response?: {
        message?: string
        data?: Record<string, { code?: string; message?: string } | string>
      }
    }

    const responseData = pbErr.data?.data || pbErr.response?.data
    const responseMsg = pbErr.data?.message || pbErr.response?.message || pbErr.message || ''

    // 1. Check for relation / foreign key constraint violation (e.g. attempting delete when referenced)
    if (
      responseMsg.includes('Make sure that the record is not part of a required relation reference') ||
      responseMsg.includes('FOREIGN KEY constraint failed') ||
      responseMsg.includes('required relation reference')
    ) {
      return 'לא ניתן למחוק את הרשומה ישירות כיוון שרשומות אחרות במערכת מקושרות אליה (שיחות, תורים או רישומים). יש להשתמש במחיקה משורשרת (Cascade Delete).'
    }

    // 2. Check for field-specific validation errors
    if (responseData && typeof responseData === 'object' && Object.keys(responseData).length > 0) {
      const fieldErrors: string[] = []

      for (const [field, errorDetail] of Object.entries(responseData)) {
        const fieldName = FIELD_LABELS[field] || field
        let code = ''
        let rawMsg = ''

        if (typeof errorDetail === 'object' && errorDetail !== null) {
          code = errorDetail.code || ''
          rawMsg = errorDetail.message || ''
        } else if (typeof errorDetail === 'string') {
          rawMsg = errorDetail
        }

        if (code && CODE_MESSAGES[code]) {
          fieldErrors.push(`• ${fieldName}: ${CODE_MESSAGES[code]}`)
        } else if (rawMsg.toLowerCase().includes('unique')) {
          fieldErrors.push(`• ${fieldName}: ערך זה כבר קיים במערכת עבור רשומה אחרת`)
        } else if (rawMsg.toLowerCase().includes('required')) {
          fieldErrors.push(`• ${fieldName}: שדה חובה חסר`)
        } else if (rawMsg) {
          fieldErrors.push(`• ${fieldName}: ${rawMsg}`)
        } else {
          fieldErrors.push(`• שגיאה בשדה ${fieldName}`)
        }
      }

      if (fieldErrors.length > 0) {
        return `שגיאה בנתונים:\n${fieldErrors.join('\n')}`
      }
    }

    // 3. Status-based translations
    if (pbErr.status === 404) {
      return 'הרשומה המבוקשת לא נמצאה במערכת.'
    }
    if (pbErr.status === 403) {
      return 'אין לך הרשאה מתאימה לביצוע פעולה זו.'
    }
    if (pbErr.status === 409) {
      return 'קיימת התנגשות נתונים במסד הנתונים. נסה לרענן את העמוד.'
    }
    if (responseMsg && !responseMsg.toLowerCase().includes('something went wrong')) {
      return responseMsg
    }
  }

  if (err instanceof Error) {
    if (err.message.includes('Make sure that the record is not part of a required relation reference')) {
      return 'לא ניתן למחוק את הרשומה ישירות כיוון שרשומות אחרות במערכת מקושרות אליה. יש להשתמש במחיקה משורשרת.'
    }
    if (err.message.includes('FOREIGN KEY constraint failed')) {
      return 'הפעולה נחסמה עקב תלות בקשרים אחרים במסד הנתונים.'
    }
    return stripErrorCode(err.message) || fallback
  }

  if (typeof err === 'string' && err.trim().length > 0) {
    return stripErrorCode(err)
  }

  return fallback
}

/**
 * A failed PocketBase batch reports "Batch transaction failed." with the real cause nested per
 * request. Returns the first nested error so it can be explained to the user.
 */
export function firstBatchRequestError(err: unknown): unknown {
  if (!(err instanceof ClientResponseError)) return err
  const requests: unknown = err.response?.data?.requests
  if (!requests || typeof requests !== 'object') return err
  for (const entry of Object.values(requests)) {
    if (entry && typeof entry === 'object' && 'response' in entry) return { status: 400, data: entry.response }
    if (entry && typeof entry === 'object' && 'message' in entry) return { status: 400, data: entry }
  }
  return err
}
