import { describe, it, expect } from 'vitest'
import {
  DRAWER_NAV_ITEMS,
  MOBILE_NAV_ITEMS,
  NAV_GROUPS,
  NAV_ITEMS,
  SETTINGS_SUB_ITEMS,
  routeTitle,
  settingsBackTarget,
} from '@/components/navigation'

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

describe('primary navigation grouping (track-b B6.6)', () => {
  it('groups every primary destination by intent, with no item duplicated or dropped', () => {
    const grouped = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to))
    expect(grouped).toEqual(NAV_ITEMS.map((i) => i.to))
    expect(new Set(grouped).size).toBe(grouped.length)
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['היום', 'עבודה שוטפת', 'צינורת', 'תובנות'])
  })

  it('caps the mobile bottom bar at 5 tabs and moves analytics to the drawer', () => {
    expect(MOBILE_NAV_ITEMS.length).toBeLessThanOrEqual(5)
    expect(MOBILE_NAV_ITEMS.some((i) => i.to === '/dashboard/analytics')).toBe(false)
    expect(DRAWER_NAV_ITEMS.map((i) => i.to)).toContain('/dashboard/analytics')
  })

  it('still resolves a mobile top-bar title for every primary destination', () => {
    for (const item of NAV_ITEMS) {
      expect(routeTitle(item.to)).toBe(item.label)
    }
  })
})

