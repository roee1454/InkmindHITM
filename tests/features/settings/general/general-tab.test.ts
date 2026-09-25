import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const updateStudioSettingsSchema = z.object({
  studio_name: z
    .string()
    .trim()
    .min(2, 'נא להזין שם סטודיו תקין (לפחות 2 תווים)')
    .refine((name) => name !== 'My Studio', 'נא להזין את שם הסטודיו האמיתי שלכם'),
})

const uploadLogoSchema = z.object({
  base64: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z
    .string()
    .refine(
      (type) => ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(type),
      'סוג קובץ לא נתמך. יש להעלות תמונה בפורמט PNG, JPEG, WebP או SVG',
    ),
})

describe('General Tab — Studio Branding & Settings Validation', () => {
  it('validates a valid studio name', () => {
    const result = updateStudioSettingsSchema.safeParse({
      studio_name: 'סטודיו דיו ומחט',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.studio_name).toBe('סטודיו דיו ומחט')
    }
  })

  it('rejects empty or whitespace-only studio name', () => {
    expect(updateStudioSettingsSchema.safeParse({ studio_name: '' }).success).toBe(false)
    expect(updateStudioSettingsSchema.safeParse({ studio_name: '   ' }).success).toBe(false)
    expect(updateStudioSettingsSchema.safeParse({ studio_name: 'a' }).success).toBe(false)
  })

  it('rejects default placeholder "My Studio"', () => {
    const result = updateStudioSettingsSchema.safeParse({ studio_name: 'My Studio' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('נא להזין את שם הסטודיו האמיתי שלכם')
    }
  })

  it('validates supported image formats for logo upload', () => {
    const valid = uploadLogoSchema.safeParse({
      base64: 'data:image/png;base64,iVBORw0KGgo...',
      filename: 'logo.png',
      mimeType: 'image/png',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects unsupported image mime types', () => {
    const invalid = uploadLogoSchema.safeParse({
      base64: 'data:application/pdf;base64,...',
      filename: 'doc.pdf',
      mimeType: 'application/pdf',
    })
    expect(invalid.success).toBe(false)
  })
})
