import { describe, expect, it } from 'vitest'
import { ClientResponseError } from 'pocketbase'
import { formatDatabaseError } from '@/lib/pocketbase-error'

describe('PocketBase Error Translator (formatDatabaseError)', () => {
  it('translates relation reference / foreign key constraint errors to Hebrew cascade hint', () => {
    const errorWithRelMessage = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to delete record. Make sure that the record is not part of a required relation reference.',
        data: {},
      },
    })
    const translated = formatDatabaseError(errorWithRelMessage)
    expect(translated).toContain('לא ניתן למחוק את הרשומה ישירות כיוון שרשומות אחרות במערכת מקושרות אליה')
    expect(translated).toContain('Cascade Delete')
  })

  it('translates SQLite FOREIGN KEY constraint failed errors', () => {
    const sqliteFkError = new Error('FOREIGN KEY constraint failed')
    expect(formatDatabaseError(sqliteFkError)).toContain('תלות בקשרים אחרים במסד הנתונים')
  })

  it('translates field-specific unique constraint errors', () => {
    const uniqueError = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          phone: { code: 'validation_not_unique', message: 'Value must be unique' },
        },
      },
    })
    const translated = formatDatabaseError(uniqueError)
    expect(translated).toContain('מספר טלפון')
    expect(translated).toContain('כבר קיים במערכת')
  })

  it('translates required field validation errors with Hebrew field labels', () => {
    const requiredError = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          email: { code: 'validation_required', message: 'Field is required' },
          start_time: { code: 'validation_required', message: 'Field is required' },
        },
      },
    })
    const translated = formatDatabaseError(requiredError)
    expect(translated).toContain('כתובת אימייל: הינו שדה חובה')
    expect(translated).toContain('מועד התור: הינו שדה חובה')
  })

  it('translates status 404, 403, and 409 responses cleanly', () => {
    const notFound = new ClientResponseError({
      status: 404,
      response: { message: 'Not found.' },
    })
    expect(formatDatabaseError(notFound)).toBe('הרשומה המבוקשת לא נמצאה במערכת.')

    const forbidden = new ClientResponseError({
      status: 403,
      response: { message: 'Forbidden.' },
    })
    expect(formatDatabaseError(forbidden)).toBe('אין לך הרשאה מתאימה לביצוע פעולה זו.')

    const conflict = new ClientResponseError({
      status: 409,
      response: { message: 'Conflict.' },
    })
    expect(formatDatabaseError(conflict)).toBe('קיימת התנגשות נתונים במסד הנתונים. נסה לרענן את העמוד.')
  })

  it('handles standard Error instances and strings', () => {
    const standardError = new Error('שגיאה ידנית כלשהי')
    expect(formatDatabaseError(standardError)).toBe('שגיאה ידנית כלשהי')

    expect(formatDatabaseError('שגיאת מחרוזת ישירה')).toBe('שגיאת מחרוזת ישירה')
  })

  it('returns custom fallback when error is undefined or empty', () => {
    expect(formatDatabaseError(null, 'ברירת מחדל')).toBe('ברירת מחדל')
    expect(formatDatabaseError(undefined, 'ברירת מחדל')).toBe('ברירת מחדל')
  })
})
