/// <reference path="../pb_data/types.d.ts" />

// Data-integrity rules that must hold no matter who deletes a record: the CRM's Node server, the
// PocketBase admin UI, an MCP tool, or a cascade from a parent record. Relation cascades
// themselves are schema-level (see 1786830040_data_integrity_cascade.js); these hooks add what a
// cascade flag can't express. Covered by tests/integration/data-integrity.test.ts.
//
// Handlers run in isolated VMs and can't see this file's top-level scope, so the shared logic
// lives in ./lib/data-integrity.js and is require()d inside each handler.

// PocketBase only opens its own transaction around the cascade step, so the top-level record's
// hooks (and anything they write, e.g. an integration_outbox row) would otherwise run outside it.
// Registered first so it wraps every handler below: the guards, the hooks' writes, PocketBase's
// reference checks, the DELETE and the cascade all commit or roll back together.
onRecordDelete((e) => {
  if (e.app.isTransactional()) {
    e.next()
    return
  }
  e.app.runInTransaction((txApp) => {
    e.app = txApp
    e.next()
  })
}, 'customers', 'staff', 'appointments', 'conversations')

// A customer with an upcoming pending/confirmed appointment can't be deleted. Those appointments
// must be cancelled through the normal flow first, which notifies the customer, frees the slot
// for the waitlist and removes the Google Calendar event.
onRecordDelete((e) => {
  const integrity = require(`${__hooks}/lib/data-integrity.js`)
  integrity.assertCustomerHasNoActiveAppointments(e.app, e.record)
  e.next()
}, 'customers')

// The studio must always keep at least one owner.
onRecordDelete((e) => {
  const integrity = require(`${__hooks}/lib/data-integrity.js`)
  integrity.assertNotLastOwner(e.app, e.record)
  e.next()
}, 'staff')

// Runs inside the delete's transaction, before PocketBase unsets the optional relations pointing
// at this appointment, and also for appointments removed by a customer cascade.
onRecordDeleteExecute((e) => {
  const integrity = require(`${__hooks}/lib/data-integrity.js`)
  integrity.releaseWaitlistEntries(e.app, e.record)
  integrity.enqueueGoogleEventDeletion(e.app, e.record)
  e.next()
}, 'appointments')
