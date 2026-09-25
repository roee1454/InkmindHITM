/// <reference path="../pb_data/types.d.ts" />

// Every customer appointment belongs to a project, whoever creates it: the staff calendar, the
// WhatsApp bot, the MCP assistant or the admin UI. Callers that know the project (continuing a
// consultation into a tattoo, the bot rebooking a hold) pass it; everyone else gets a new one here.
// Logic in ./lib/projects.js; covered by tests/integration/projects.test.ts.

onRecordCreate((e) => {
  const projects = require(`${__hooks}/lib/projects.js`)
  projects.syncKindAndType(e.record, null)
  projects.inTransaction(e, (app) => projects.ensureProject(app, e.record, null))
}, 'appointments')

onRecordUpdate((e) => {
  const projects = require(`${__hooks}/lib/projects.js`)
  const original = e.record.original()
  projects.syncKindAndType(e.record, original)
  projects.inTransaction(e, (app) => projects.ensureProject(app, e.record, original))
}, 'appointments')
