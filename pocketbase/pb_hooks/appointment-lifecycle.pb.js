/// <reference path="../pb_data/types.d.ts" />

// Stamps and logs every appointment status change, from any writer (logic in
// ./lib/appointment-lifecycle.js), then re-derives the project stage the change may have moved
// (./lib/project-stage.js), with the same attribution. Runs inside the save's transaction: the log
// rows and the stage commit or roll back with the change they describe.

onRecordCreateExecute((e) => {
  const lifecycle = require(`${__hooks}/lib/appointment-lifecycle.js`)
  const stage = require(`${__hooks}/lib/project-stage.js`)
  const attribution = lifecycle.recordStatusChange(e.app, e.record, null)
  e.next()
  stage.refreshProjects(e.app, [e.record.getString('project')], attribution)
}, 'appointments')

onRecordUpdateExecute((e) => {
  const lifecycle = require(`${__hooks}/lib/appointment-lifecycle.js`)
  const stage = require(`${__hooks}/lib/project-stage.js`)
  const original = e.record.original()
  const attribution = lifecycle.recordStatusChange(e.app, e.record, original)
  e.next()
  // An appointment moved to another project changes both.
  stage.refreshProjects(e.app, [e.record.getString('project'), original.getString('project')], attribution)
}, 'appointments')

onRecordDeleteExecute((e) => {
  const stage = require(`${__hooks}/lib/project-stage.js`)
  e.next()
  stage.refreshProjects(e.app, [e.record.getString('project')], { actor: '', reason: 'appointment_deleted' })
}, 'appointments')
