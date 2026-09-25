import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildBaseTools } from '@/integrations/ai/tools/base.server'
import { buildBookingTools } from '@/integrations/ai/tools/booking'
import { sanitizeClientName } from '@/lib/sanitization'
import type { ToolFactoryContext } from '@/integrations/ai/tools/types'

describe('Cluster 3 AI Tools Security', () => {
  let mockSu: any
  let mockTransitionState: any
  let mockNotifyStaff: any
  let mockContext: ToolFactoryContext

  beforeEach(() => {
    mockSu = {
      collection: vi.fn().mockReturnValue({
        update: vi.fn().mockResolvedValue({}),
        getOne: vi.fn().mockResolvedValue({ id: 'c1', name: 'לקוח בדיקה' }),
        getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
        getFirstListItem: vi.fn(),
      }),
    }
    mockTransitionState = vi.fn().mockResolvedValue(undefined)
    mockNotifyStaff = vi.fn().mockResolvedValue(undefined)

    mockContext = {
      su: mockSu,
      conversationId: 'conv1',
      customerId: 'cust1',
      conversationState: 'COLLECTING_INFO',
      customerPhone: '972501234567',
      transitionState: mockTransitionState,
      notifyStaff: mockNotifyStaff,
      updateConversation: vi.fn(),
      botTool: (_desc: string, schema: any, execute: any) => ({
        description: _desc,
        parameters: schema,
        execute,
      }),
    } as any
  })

  describe('Bug 42: customer name sanitization and deletion of save_client_name tool', () => {
    it('verifies that save_client_name is completely deleted from base tools', () => {
      const baseTools = buildBaseTools(mockContext) as any
      expect(baseTools.save_client_name).toBeUndefined()
    })

    it('sanitizes a clean valid Hebrew or English name', () => {
      expect(sanitizeClientName('  דניאל   כהן  ')).toBe('דניאל כהן')
      expect(sanitizeClientName('Roee Haili')).toBe('Roee Haili')
    })

    it('rejects an invalid name containing HTML / script tags / special characters', () => {
      expect(sanitizeClientName('<script>alert("hack")</script>')).toBeNull()
    })

    it('rejects a name that is too short or has numbers', () => {
      expect(sanitizeClientName('א1')).toBeNull()
      expect(sanitizeClientName('a')).toBeNull()
    })
  })

  describe('Bug 41: confirm_booking_final deposit enforcement', () => {
    beforeEach(() => {
      mockContext.conversationState = 'AWAIT_FINAL_CONFIRMATION'
    })

    it('does not lock the appointment when the conversation is not at the final confirmation', async () => {
      mockContext.conversationState = 'COLLECTING_INFO'
      mockSu.collection().getFirstListItem.mockResolvedValue({ id: 'appt1', status: 'pending', deposit_amount: 200, deposit_paid: true })

      const result = await (buildBookingTools(mockContext).confirm_booking_final as any).execute({})

      expect(result.status).toBe('error')
      expect(mockSu.collection().update).not.toHaveBeenCalled()
      expect(mockTransitionState).not.toHaveBeenCalled()
    })

    it('blocks confirmation when deposit is required but unpaid', async () => {
      mockSu.collection().getFirstListItem.mockResolvedValue({
        id: 'appt1',
        status: 'pending',
        deposit_amount: 200,
        deposit_paid: false,
      })

      const bookingTools = buildBookingTools(mockContext)
      const result = await (bookingTools.confirm_booking_final as any).execute({})

      expect(result.status).toBe('error')
      expect(result.message).toContain('יש להמתין לאישור קבלת המקדמה')
      expect(mockSu.collection().update).not.toHaveBeenCalled()
      expect(mockTransitionState).not.toHaveBeenCalled()
    })

    it('allows confirmation when deposit was paid', async () => {
      mockSu.collection().getFirstListItem.mockResolvedValue({
        id: 'appt1',
        status: 'pending',
        deposit_amount: 200,
        deposit_paid: true,
      })

      const bookingTools = buildBookingTools(mockContext)
      const result = await (bookingTools.confirm_booking_final as any).execute({})

      expect(result.status).toBe('success')
      expect(result.message).toContain('התור ננעל סופית')
      expect(mockSu.collection().update).toHaveBeenCalledWith('appt1', { status: 'confirmed', status_actor: 'bot', status_reason: 'confirm_booking_final' })
      expect(mockTransitionState).toHaveBeenCalledWith('AWAITING_APPOINTMENT', {
        reason: 'confirm_booking_final',
      })
    })

    it('allows confirmation when no deposit is required (amount is 0)', async () => {
      mockSu.collection().getFirstListItem.mockResolvedValue({
        id: 'appt1',
        status: 'pending',
        deposit_amount: 0,
        deposit_paid: false,
      })

      const bookingTools = buildBookingTools(mockContext)
      const result = await (bookingTools.confirm_booking_final as any).execute({})

      expect(result.status).toBe('success')
      expect(mockSu.collection().update).toHaveBeenCalledWith('appt1', { status: 'confirmed', status_actor: 'bot', status_reason: 'confirm_booking_final' })
    })
  })

  describe('appointment tools re-check the facts when they run', () => {
    it('does not escalate a reschedule request when the customer has no upcoming appointment', async () => {
      mockSu.collection().getFullList = vi.fn().mockResolvedValue([])

      const result = await (buildBookingTools(mockContext).request_reschedule as any).execute({ details: 'יום שלישי' })

      expect(result.status).toBe('error')
      expect(mockContext.updateConversation).not.toHaveBeenCalled()
      expect(mockNotifyStaff).not.toHaveBeenCalled()
    })

    it('does not put a hold on the bring-forward list, only a confirmed appointment', async () => {
      mockSu.collection().getFullList = vi.fn().mockResolvedValue([{ id: 'hold1', status: 'pending' }])
      mockSu.collection().create = vi.fn()

      const result = await (buildBookingTools(mockContext).flag_earlier_preference as any).execute({})

      expect(result.status).toBe('error')
      expect(mockSu.collection().create).not.toHaveBeenCalled()
    })
  })
})
