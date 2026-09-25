/// <reference path="../pb_data/types.d.ts" />
// PROJECT_IN_PROGRESS: the dialogue state of a customer between sessions of a multi-session
// project (track-b B3.3). customers.lead_stage still mirrors the conversation state until B3.7,
// so it takes the value too.
const STATE = 'PROJECT_IN_PROGRESS'
const AFTER = 'AWAITING_APPOINTMENT'

function addValue(app, collection, fieldName) {
  const col = app.findCollectionByNameOrId(collection)
  const field = col.fields.getByName(fieldName)
  if (!field || field.values.includes(STATE)) return
  const values = [...field.values]
  const at = values.indexOf(AFTER)
  values.splice(at < 0 ? values.length : at + 1, 0, STATE)
  field.values = values
  app.save(col)
}

function removeValue(app, collection, fieldName, fallback) {
  const col = app.findCollectionByNameOrId(collection)
  const field = col.fields.getByName(fieldName)
  if (!field || !field.values.includes(STATE)) return
  // Rows in the removed state fall back first, or the select would hold a value it no longer allows.
  app.db().newQuery(`UPDATE ${collection} SET ${fieldName} = {:to} WHERE ${fieldName} = {:from}`).bind({ to: fallback, from: STATE }).execute()
  field.values = field.values.filter((v) => v !== STATE)
  app.save(col)
}

migrate(
  (app) => {
    addValue(app, 'conversations', 'state')
    addValue(app, 'customers', 'lead_stage')
  },
  (app) => {
    removeValue(app, 'conversations', 'state', 'NEW')
    removeValue(app, 'customers', 'lead_stage', 'NEW')
  },
)
