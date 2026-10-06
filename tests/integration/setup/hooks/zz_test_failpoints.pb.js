/// <reference path="../pb_data/types.d.ts" />

// Test-only (copied into the integration PocketBase's hooks dir, never into pocketbase/pb_hooks).
// Lets tests/integration/data-integrity.test.ts force a failure in the *middle* of a delete to
// prove that the whole delete, its cascade and the rows our hooks wrote roll back together.
// Loaded after data-integrity.pb.js ("zz_" prefix), so it runs after that file's handlers.
onRecordDeleteExecute((e) => {
  e.next()
  if (e.record.getString('body') === '__failpoint__') {
    throw new BadRequestError('failpoint:message_delete')
  }
}, 'messages')

onRecordDeleteExecute((e) => {
  e.next()
  if (e.record.getString('google_event_id') === '__failpoint__') {
    throw new BadRequestError('failpoint:appointment_delete')
  }
}, 'appointments')

// Fails an appointment update after it was written (inside the transaction), to prove that a
// batch — e.g. closing a session with its payments — rolls back as a whole.
onRecordUpdateExecute((e) => {
  e.next()
  if (e.record.getString('notes') === '__failpoint_update__') {
    throw new BadRequestError('failpoint:appointment_update')
  }
}, 'appointments')
