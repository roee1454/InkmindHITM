import { describe, it, expect } from 'vitest'
import { SETTINGS_SUB_ITEMS, routeTitle, settingsBackTarget } from '@/components/navigation'

describe('Settings Navigation & 4-Tab IA', () => {
  it('consolidates settings to 4 screens in the specified order', () => {
    expect(SETTINGS_SUB_ITEMS.length).toBe(4)
    expect(SETTINGS_SUB_ITEMS.map((item) => item.id)).toEqual([
      'general',
      'team',
      'ai',
      'system',
    ])
    expect(SETTINGS_SUB_ITEMS.map((item) => item.route)).toEqual([
      '/dashboard/settings/general',
      '/dashboard/settings/team',
      '/dashboard/settings/ai',
      '/dashboard/settings/system',
    ])
  })

  it('provides correct routeTitle for all 4 screens and fallbacks', () => {
    expect(routeTitle('/dashboard/settings/general')).toBe('כללי')
    expect(routeTitle('/dashboard/settings/team')).toBe('צוות')
    expect(routeTitle('/dashboard/settings/ai')).toBe('סוכן AI')
    expect(routeTitle('/dashboard/settings/system')).toBe('מערכת')
    expect(routeTitle('/dashboard/settings')).toBe('הגדרות')
  })

  it('correctly maps settingsBackTarget on mobile', () => {
    // Top-level settings routes go back to /dashboard/settings
    expect(settingsBackTarget('/dashboard/settings/general', {})).toEqual({
      to: '/dashboard/settings',
    })
    expect(settingsBackTarget('/dashboard/settings/ai', {})).toEqual({
      to: '/dashboard/settings',
    })
    expect(settingsBackTarget('/dashboard/settings/system', {})).toEqual({
      to: '/dashboard/settings',
    })

    // Staff member deep link goes back to staff list
    expect(settingsBackTarget('/dashboard/settings/team', { staff: 'st_123' })).toEqual({
      to: '/dashboard/settings/team',
      search: {},
    })

    // Non-admin goes to /dashboard
    expect(settingsBackTarget('/dashboard/settings/team', {}, false)).toEqual({
      to: '/dashboard',
    })
  })
})

