/// <reference path="../pb_data/types.d.ts" />

// Stamps and logs every appointment status change, from any writer (logic in
// ./lib/appointment-lifecycle.js). Runs inside the save's transaction: the log row commits or rolls
// back with the change it describes.

onRecordCreateExecute((e) => {
  const lifecycle = require(`${__hooks}/lib/appointment-lifecycle.js`)
  lifecycle.recordStatusChange(e.app, e.record, null)
  e.next()
}, 'appointments')

onRecordUpdateExecute((e) => {
  const lifecycle = require(`${__hooks}/lib/appointment-lifecycle.js`)
  lifecycle.recordStatusChange(e.app, e.record, e.record.original())
  e.next()
}, 'appointments')
