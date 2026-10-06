import { describe, expect, it, vi } from 'vitest'
import { handleUpdateAppointment } from '@/features/calendar/server/appointments.server'
import { handleDeleteEntity } from '@/features/database/server/delete-entity.server'
import type PocketBase from 'pocketbase'

describe('Calendar RBAC & Scoping Unit Tests', () => {
  it('blocks non-admin staff from updating an appointment of another artist', async () => {
    const fakeSu = {
      collection: vi.fn().mockReturnValue({
        getOne: vi.fn().mockResolvedValue({
          id: 'appt_1',
          staff: 'other_staff_id',
          customer: 'cust_1',
        }),
      }),
    } as unknown as PocketBase

    const staffSession = {
      staff: {
        id: 'my_staff_id',
        role: 'staff',
      },
    }

    await expect(
      handleUpdateAppointment(
        { id: 'appt_1', notes: 'New note' },
        fakeSu,
        staffSession,
      ),
    ).rejects.toThrow('אין הרשאה לעדכן תור של מקעקע אחר.')
  })

  it('allows owner or admin to update any artist appointment', async () => {
    const updateMock = vi.fn().mockResolvedValue({ id: 'appt_1' })
    const fakeSu = {
      collection: vi.fn().mockReturnValue({
        getOne: vi.fn().mockResolvedValue({
          id: 'appt_1',
          staff: 'other_staff_id',
          customer: 'cust_1',
          start_time: '2026-09-20T10:00:00Z',
        }),
        update: updateMock,
        getFullList: vi.fn().mockResolvedValue([]),
      }),
    } as unknown as PocketBase

    const adminSession = {
      staff: {
        id: 'admin_id',
        role: 'admin',
      },
    }

    const res = await handleUpdateAppointment(
      { id: 'appt_1', notes: 'Admin update' },
      fakeSu,
      adminSession,
    )

    expect(res).toBeDefined()
    expect(updateMock).toHaveBeenCalled()
  })

  it('blocks non-admin staff from deleting an appointment of another artist', async () => {
    const deleteMock = vi.fn()
    const fakeSu = {
      collection: vi.fn().mockReturnValue({
        getOne: vi.fn().mockResolvedValue({ id: 'appt_1', staff: 'other_staff_id' }),
        delete: deleteMock,
      }),
    } as unknown as PocketBase

    const result = await handleDeleteEntity(
      { collection: 'appointments', id: 'appt_1' },
      { su: fakeSu, actor: { id: 'my_staff_id', role: 'staff' } },
    )

    expect(result).toEqual({ status: 'forbidden' })
    expect(deleteMock).not.toHaveBeenCalled()
  })
})

