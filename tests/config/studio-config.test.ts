import { describe, it, expect } from 'vitest'
import { studioConfigSchema } from '@/config/studio/schema'
import { studioConfig } from '@/config/studio.config'
import { artistColor } from '@/features/calendar/utils/artist-colors'

describe('Studio Configuration Interface & Schema', () => {
  it('validates a complete studio configuration', () => {
    const valid = studioConfigSchema.safeParse({
      studioName: 'Test Tattoo',
      tagline: 'Custom Tagline',
      logoAssetUrl: '/branding/custom-logo.png',
      timezone: 'Asia/Jerusalem',
      currency: 'ILS',
      depositRequired: true,
      depositAmount: 150,
      paymentInstructions: 'Bit to 050-0000000',
    })

    expect(valid.success).toBe(true)
    if (valid.success) {
      expect(valid.data.studioName).toBe('Test Tattoo')
      expect(valid.data.depositAmount).toBe(150)
      expect(valid.data.depositRequired).toBe(true)
      expect(valid.data.cancellationCutoffHours).toBe(48) // default applied
    }
  })

  it('active studio.config.ts passes schema validation', () => {
    const res = studioConfigSchema.safeParse(studioConfig)
    expect(res.success).toBe(true)
    expect(studioConfig.studioName.length).toBeGreaterThan(0)
    expect(studioConfig.logoAssetUrl).toBe('/branding/logo.png')
  })

  it('artistColor returns solid unified styling for all artist IDs', () => {
    const artist1 = artistColor('staff-123')
    const artist2 = artistColor('staff-456')
    const unassigned = artistColor(null)

    expect(artist1).toEqual(artist2)
    expect(artist1).toEqual(unassigned)
    expect(artist1.monogram).toContain('bg-muted')
    expect(artist1.monogram).not.toContain('artist-')
    expect(artist1.surface).not.toContain('artist-')
  })
})
