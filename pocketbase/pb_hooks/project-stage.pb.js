/// <reference path="../pb_data/types.d.ts" />

// Every project save re-derives its funnel stage (logic in ./lib/project-stage.js): the explicit
// milestones (quote sent, lost, completed) are written by the Node server, the rest follows the
// project's appointments (see appointment-lifecycle.pb.js). Nobody sets `stage` directly: a
// written value is overwritten by the derived one.

onRecordCreateExecute((e) => {
  const stage = require(`${__hooks}/lib/project-stage.js`)
  stage.applyStage(e.app, e.record, null)
  e.next()
}, 'projects')

onRecordUpdateExecute((e) => {
  const stage = require(`${__hooks}/lib/project-stage.js`)
  stage.applyStage(e.app, e.record, e.record.original())
  e.next()
}, 'projects')
