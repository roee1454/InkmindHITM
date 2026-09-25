import type { StaffRole } from '@/integrations/pocketbase/types'

/** Port of WAHA's `canEditLead`: admins (owner|admin) may edit any lead; an unassigned
 *  lead is editable by anyone; otherwise only the staff member it's assigned to may edit
 *  it. Shared by client (lock/drag UI) and server (enforcement) — WAHA duplicated this
 *  rule once per side. */
export function canEditLead(
  staff: { id: string; role: StaffRole },
  assignedStaffId: string | null,
): boolean {
  if (staff.role === 'owner' || staff.role === 'admin') return true
  return assignedStaffId === null || assignedStaffId === staff.id
}
