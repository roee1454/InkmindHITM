import { describe, expect, it } from 'vitest'
import {
  STATUS_LABEL,
  STAFF_REASON_LABELS,
  hasStaffActionButtons,
  isAwaitingCustomerAction,
} from '@/features/conversations/utils/labels'
import { formatPhoneForDisplay, phoneMatchesQuery, toCanonicalE164Phone } from '@/lib/phone'
import { formatWindowRemaining, formatMessageDateSeparator, getDateKey } from '@/features/conversations/utils/format'
import { shouldExcludeTemplate } from '@/features/conversations/utils/templates'

describe('Conversations Redesign & Labels Consolidation', () => {
  describe('Canonical Labels (Bug 2 Fix)', () => {
    it('provides unified Hebrew labels for conversation statuses', () => {
      expect(STATUS_LABEL.escalated).toBe('ממתין למענה')
      expect(STATUS_LABEL.staff_handling).toBe('בטיפול צוות')
      expect(STATUS_LABEL.bot_active).toBe('בוט')
      expect(STATUS_LABEL.closed).toBe('סגור')
    })

    it('provides unified Hebrew labels for staff intervention reasons', () => {
      expect(STAFF_REASON_LABELS.price_offering).toBe('הצעת מחיר')
      expect(STAFF_REASON_LABELS.receipt_verification).toBe('אימות תשלום')
      expect(STAFF_REASON_LABELS.consultation_alert).toBe('נדרש ייעוץ')
      expect(STAFF_REASON_LABELS.slot_conflict).toBe('התנגשות תורים')
      expect(STAFF_REASON_LABELS.cancel_request).toBe('בקשת ביטול')
    })
  })

  describe('Phone Utility Integration for New Conversation Dialog', () => {
    it('converts local Israeli mobile numbers to canonical E164', () => {
      expect(toCanonicalE164Phone('0501234567')).toBe('+972501234567')
      expect(toCanonicalE164Phone('052-987-6543')).toBe('+972529876543')
      expect(toCanonicalE164Phone('+972540001122')).toBe('+972540001122')
    })

    it('formats phone numbers for display in domestic Israeli format', () => {
      expect(formatPhoneForDisplay('0501234567')).toBe('0501234567')
      expect(formatPhoneForDisplay('+972501234567')).toBe('0501234567')
    })

    it('matches phone queries flexibly ignoring hyphens and prefixes', () => {
      expect(phoneMatchesQuery('0501234567', '050123')).toBe(true)
      expect(phoneMatchesQuery('+972501234567', '050-123')).toBe(true)
      expect(phoneMatchesQuery('0501234567', '9999')).toBe(false)
    })
  })

  describe('Timestamp and 24h Window Formatters', () => {
    it('correctly reports open 24h window (>= 12 hours)', () => {
      const future = new Date(Date.now() + 15 * 3600 * 1000).toISOString()
      const info = formatWindowRemaining(future)
      expect(info.status).toBe('open')
      expect(info.label).toContain('שעות')
    })

    it('correctly reports closing-soon 24h window (< 12 hours)', () => {
      const closingSoon = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      const info = formatWindowRemaining(closingSoon)
      expect(info.status).toBe('closing-soon')
      expect(info.label).toContain('דקות')
    })

    it('correctly reports expired 24h window', () => {
      const expired = new Date(Date.now() - 3600 * 1000).toISOString()
      const info = formatWindowRemaining(expired)
      expect(info.status).toBe('expired')
      expect(info.label).toBe('חלון 24 השעות פג')
    })

    it('formats date separators and keys properly', () => {
      const todayIso = new Date().toISOString()
      expect(getDateKey(todayIso)).toBeDefined()
      expect(formatMessageDateSeparator(todayIso)).toBe('היום')
    })
  })

  describe('Bot Typing Indicator State Logic', () => {
    function shouldShowBotTyping(
      status: string,
      lastMessage: { direction: 'inbound' | 'outbound'; timestamp: string } | null,
    ) {
      if (status !== 'bot_active' || !lastMessage) return false
      if (lastMessage.direction !== 'inbound') return false
      const msgTime = new Date(lastMessage.timestamp).getTime()
      return Date.now() - msgTime < 45_000
    }

    it('shows typing indicator when bot is active and inbound message was received recently', () => {
      const recentInbound = {
        direction: 'inbound' as const,
        timestamp: new Date(Date.now() - 5_000).toISOString(),
      }
      expect(shouldShowBotTyping('bot_active', recentInbound)).toBe(true)
    })

    it('hides typing indicator when last message is outbound from bot or staff', () => {
      const outboundMessage = {
        direction: 'outbound' as const,
        timestamp: new Date().toISOString(),
      }
      expect(shouldShowBotTyping('bot_active', outboundMessage)).toBe(false)
    })

    it('hides typing indicator when conversation is in staff handling or escalated', () => {
      const recentInbound = {
        direction: 'inbound' as const,
        timestamp: new Date().toISOString(),
      }
      expect(shouldShowBotTyping('staff_handling', recentInbound)).toBe(false)
      expect(shouldShowBotTyping('escalated', recentInbound)).toBe(false)
    })

    it('hides typing indicator when inbound message is older than 45 seconds', () => {
      const oldInbound = {
        direction: 'inbound' as const,
        timestamp: new Date(Date.now() - 60_000).toISOString(),
      }
      expect(shouldShowBotTyping('bot_active', oldInbound)).toBe(false)
    })
  })

  describe('Hebrew Template Metadata & Parameter Preview', () => {
    function renderPreview(bodyText: string, params: Array<{ index: number }>, values: string[]): string {
      let preview = bodyText
      params.forEach((p, idx) => {
        const val = values[idx]?.trim() || `{{${p.index}}}`
        const regex = new RegExp(`\\{\\{${p.index}\\}\\}`, 'g')
        preview = preview.replace(regex, val)
      })
      return preview
    }

    it('correctly replaces template placeholders with user-provided parameters', () => {
      const body = 'שלום {{1}}, תזכורת לתור שלך בתאריך {{2}} בשעה {{3}}.'
      const params = [{ index: 1 }, { index: 2 }, { index: 3 }]
      const values = ['רועי', '25.09.2026', '14:00']

      const rendered = renderPreview(body, params, values)
      expect(rendered).toBe('שלום רועי, תזכורת לתור שלך בתאריך 25.09.2026 בשעה 14:00.')
    })

    it('leaves unfulfilled placeholders formatted as {{index}} in preview', () => {
      const body = 'שלום {{1}}, מחכים לך בסטודיו עם {{2}}!'
      const params = [{ index: 1 }, { index: 2 }]
      const values = ['איתי']

      const rendered = renderPreview(body, params, values)
      expect(rendered).toBe('שלום איתי, מחכים לך בסטודיו עם {{2}}!')
    })
  })

  describe('New Recipient Contact Validation', () => {
    function validateNewContact(name: string, phone: string) {
      const trimmedName = name.trim()
      const trimmedPhone = phone.trim()

      if (trimmedName.length < 2) {
        return { valid: false, error: 'name_too_short' }
      }
      if (/^\+?[\d\s\-()]+$/.test(trimmedName)) {
        return { valid: false, error: 'name_cannot_be_phone' }
      }
      const canonical = toCanonicalE164Phone(trimmedPhone)
      const digits = canonical.replace(/\D/g, '')
      if (digits.length < 9) {
        return { valid: false, error: 'invalid_phone' }
      }
      return { valid: true, error: null, canonicalPhone: canonical }
    }

    it('rejects contact names that are empty or single character', () => {
      expect(validateNewContact('', '0501234567').valid).toBe(false)
      expect(validateNewContact('A', '0501234567').valid).toBe(false)
    })

    it('strictly forbids setting a raw phone number as the customer name', () => {
      expect(validateNewContact('0501234567', '0501234567').error).toBe('name_cannot_be_phone')
      expect(validateNewContact('054-9988776', '0549988776').error).toBe('name_cannot_be_phone')
      expect(validateNewContact('+972521112233', '0521112233').error).toBe('name_cannot_be_phone')
    })

    it('accepts valid customer names and Israeli mobile numbers', () => {
      const result = validateNewContact('נועה קירל', '052-1234567')
      expect(result.valid).toBe(true)
      expect(result.canonicalPhone).toBe('+972521234567')
    })
  })

  describe('Meta Sample Templates & en_US Filtering', () => {
    it('identifies Meta default sample templates accurately', () => {
      expect(shouldExcludeTemplate({ name: 'sample_flight_confirmation', language: 'en_US' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'sample_issue_resolution', language: 'en_US' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'hello_world', language: 'en_US' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'sample_movie_ticket_confirmation' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'sample_package_tracking' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'sample_purchase_feedback' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'sample_shipping_confirmation' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'sample_happy_hour_announcement' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'SAMPLE_FLIGHT_CONFIRMATION' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'sample-test' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'sample' })).toBe(true)
    })

    it('strictly excludes any template with en_US language regardless of name', () => {
      expect(shouldExcludeTemplate({ name: 'custom_template', language: 'en_US' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'order_update', language: 'en_us' })).toBe(true)
      expect(shouldExcludeTemplate({ name: 'greeting', language: 'en-US' })).toBe(true)
    })

    it('does not filter legitimate studio templates in Hebrew', () => {
      expect(shouldExcludeTemplate({ name: 'appointment_reminder_3d', language: 'he' })).toBe(false)
      expect(shouldExcludeTemplate({ name: 'appointment_reminder_1d', language: 'he' })).toBe(false)
      expect(shouldExcludeTemplate({ name: 'aftercare_check', language: 'he' })).toBe(false)
      expect(shouldExcludeTemplate({ name: 'general_update', language: 'he' })).toBe(false)
      expect(shouldExcludeTemplate({ name: 'deposit_payment_link', language: 'he' })).toBe(false)
    })

    it('filters out sample and en_US templates from an array of templates', () => {
      const templatesList = [
        { name: 'hello_world', language: 'en_US', id: '1' },
        { name: 'sample_flight_confirmation', language: 'en_US', id: '2' },
        { name: 'appointment_reminder_3d', language: 'he', id: '3' },
        { name: 'random_english_template', language: 'en_US', id: '4' },
        { name: 'aftercare_check', language: 'he', id: '5' },
      ]

      const filtered = templatesList.filter((t) => !shouldExcludeTemplate(t))
      expect(filtered).toHaveLength(2)
      expect(filtered.map((t) => t.name)).toEqual(['appointment_reminder_3d', 'aftercare_check'])
    })
  })

  describe('Action Dock & Bot Deactivation Rules', () => {
    it('accurately identifies states that require staff action buttons', () => {
      // States where staff action buttons are present:
      expect(hasStaffActionButtons({ state: 'AWAIT_PRICE_OFFER' })).toBe(true)
      expect(hasStaffActionButtons({ state: 'AWAIT_PAYMENT' })).toBe(true)
      expect(hasStaffActionButtons({ staffCallReason: 'cancel_request' })).toBe(true)
      expect(hasStaffActionButtons({ staffCallReason: 'slot_conflict' })).toBe(true)
      expect(hasStaffActionButtons({ status: 'escalated' })).toBe(true)
      expect(hasStaffActionButtons({ staffCallReason: 'consultation_alert' })).toBe(true)

      // States where NO staff action buttons should be shown:
      expect(hasStaffActionButtons({ state: 'AWAIT_HEALTH_NOTICE' })).toBe(false)
      expect(hasStaffActionButtons({ state: 'AWAIT_FINAL_CONFIRMATION' })).toBe(false)
      expect(hasStaffActionButtons({ state: 'COLLECTING_INFO' })).toBe(false)
      expect(hasStaffActionButtons({ state: 'NEW' })).toBe(false)
      expect(hasStaffActionButtons({ state: 'AWAITING_APPOINTMENT' })).toBe(false)
    })

    it('accurately identifies waiting states where customer action is awaited', () => {
      expect(isAwaitingCustomerAction('AWAIT_HEALTH_NOTICE')).toBe(true)
      expect(isAwaitingCustomerAction('AWAIT_FINAL_CONFIRMATION')).toBe(true)

      expect(isAwaitingCustomerAction('AWAIT_PRICE_OFFER')).toBe(false)
      expect(isAwaitingCustomerAction('AWAIT_PAYMENT')).toBe(false)
      expect(isAwaitingCustomerAction('COLLECTING_INFO')).toBe(false)
      expect(isAwaitingCustomerAction('AWAITING_APPOINTMENT')).toBe(false)
    })

    it('ensures bot is disabled whenever action buttons are shown in UI', () => {
      function computeIsBotActive(conv: { state?: string; status?: string; staffCallReason?: string | null }) {
        const hasActions = hasStaffActionButtons(conv)
        return conv.status === 'bot_active' && !hasActions
      }

      // Even if conversation.status is 'bot_active', presence of action buttons disables bot
      expect(computeIsBotActive({ state: 'AWAIT_PRICE_OFFER', status: 'bot_active' })).toBe(false)
      expect(computeIsBotActive({ state: 'AWAIT_PAYMENT', status: 'bot_active' })).toBe(false)
      expect(computeIsBotActive({ staffCallReason: 'cancel_request', status: 'bot_active' })).toBe(false)

      // Normal bot conversation states
      expect(computeIsBotActive({ state: 'COLLECTING_INFO', status: 'bot_active' })).toBe(true)
      expect(computeIsBotActive({ state: 'AWAIT_HEALTH_NOTICE', status: 'bot_active' })).toBe(true)
      expect(computeIsBotActive({ state: 'AWAIT_FINAL_CONFIRMATION', status: 'bot_active' })).toBe(true)
    })

    it('ensures composer typing is disabled during waiting states', () => {
      function isComposerDisabled(convState: string, windowExpired: boolean, isSending: boolean) {
        const isAwaitingCustomer = isAwaitingCustomerAction(convState)
        return windowExpired || isSending || isAwaitingCustomer
      }

      expect(isComposerDisabled('AWAIT_HEALTH_NOTICE', false, false)).toBe(true)
      expect(isComposerDisabled('AWAIT_FINAL_CONFIRMATION', false, false)).toBe(true)
      expect(isComposerDisabled('COLLECTING_INFO', false, false)).toBe(false)
      expect(isComposerDisabled('AWAIT_PRICE_OFFER', false, false)).toBe(false)
    })
  })
})


