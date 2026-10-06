/// <reference path="../../pb_data/types.d.ts" />

// Error messages double as machine-readable codes: the Node server maps them to typed results
// (src/features/database/utils/integrity-codes.ts must stay in sync). PocketBase "sentenizes"
// API error messages (capital first letter, trailing period), so the Node side normalizes before
// comparing, and no `data` payload is attached: PocketBase would rewrite it into field errors.
const INTEGRITY_ERRORS = {
  customerHasActiveAppointments: 'integrity:customer_has_active_appointments',
  lastOwner: 'integrity:last_owner',
}

// PocketBase stores datetimes as "YYYY-MM-DD HH:MM:SS.sssZ"; filters compare them as text, so
// bound values must use the same layout rather than ISO's "T" separator.
function pbNow() {
  return new Date().toISOString().replace('T', ' ')
}

function assertCustomerHasNoActiveAppointments(app, customer) {
  const active = app.findRecordsByFilter(
    'appointments',
    "customer = {:customer} && start_time > {:now} && (status = 'pending' || status = 'confirmed')",
    'start_time',
    100,
    0,
    { customer: customer.id, now: pbNow() },
  )
  if (active.length > 0) {
    throw new BadRequestError(INTEGRITY_ERRORS.customerHasActiveAppointments)
  }
}

function assertNotLastOwner(app, staff) {
  if (staff.getString('role') !== 'owner') return
  const otherOwners = app.findRecordsByFilter('staff', "role = 'owner' && id != {:id}", '', 1, 0, { id: staff.id })
  if (otherOwners.length === 0) {
    throw new BadRequestError(INTEGRITY_ERRORS.lastOwner)
  }
}

// Waitlist entries hold two optional pointers at appointments, which PocketBase would silently
// unset and leave the entry in a status that no longer makes sense:
// - current_appointment: the customer's own booking they wanted to move earlier. With the
//   booking gone there's nothing to move, so the entry is cancelled.
// - offered_appointment: a freed slot offered to someone else. The offer is void, so that
//   customer goes back to waiting for the next slot.
function releaseWaitlistEntries(app, appointment) {
  const params = { id: appointment.id }

  const ownEntries = app.findRecordsByFilter(
    'waitlist_entries',
    "current_appointment = {:id} && (status = 'watching' || status = 'offered')",
    '',
    500,
    0,
    params,
  )
  for (const entry of ownEntries) {
    entry.set('status', 'cancelled')
    entry.set('offered_appointment', '')
    app.save(entry)
  }

  const offeredEntries = app.findRecordsByFilter(
    'waitlist_entries',
    'offered_appointment = {:id} && current_appointment != {:id}',
    '',
    500,
    0,
    params,
  )
  for (const entry of offeredEntries) {
    entry.set('offered_appointment', '')
    if (entry.getString('status') === 'offered') entry.set('status', 'watching')
    app.save(entry)
  }
}

// The appointment row is gone by the time the Node worker runs, so everything the Google delete
// needs is snapshotted into the payload now.
function enqueueGoogleEventDeletion(app, appointment) {
  const googleEventId = appointment.getString('google_event_id')
  const staffId = appointment.getString('staff')
  if (!googleEventId || !staffId) return

  const row = new Record(app.findCollectionByNameOrId('integration_outbox'))
  row.set('kind', 'gcal_delete_event')
  row.set('payload', { appointmentId: appointment.id, staffId: staffId, googleEventId: googleEventId })
  row.set('status', 'pending')
  row.set('attempts', 0)
  row.set('available_at', pbNow())
  app.save(row)
}

module.exports = {
  INTEGRITY_ERRORS,
  assertCustomerHasNoActiveAppointments,
  assertNotLastOwner,
  releaseWaitlistEntries,
  enqueueGoogleEventDeletion,
}
