/// <reference path="../pb_data/types.d.ts" />

// Leads kanban board: WAHA's 6 hardcoded board columns end in `expired`, but this
// collection's select still says `lost`. Rename the value so the UI's column list matches
// the enum exactly. Backfill first — PocketBase doesn't rewrite existing row values when a
// select field's `values` array changes, so any row still holding the old string would stay
// there (just unselectable going forward) unless touched explicitly.
migrate(
  (app) => {
    const staleRows = app.findRecordsByFilter('customers', "lead_stage = 'lost'", '', 0, 0)
    for (const record of staleRows) {
      record.set('lead_stage', 'expired')
      app.save(record)
    }

    const collection = app.findCollectionByNameOrId('pbc_108570809')
    const stageField = collection.fields.getById('select2761645798')
    stageField.values = ['new', 'intake', 'awaiting_price', 'awaiting_payment', 'booked', 'expired']

    return app.save(collection)
  },
  (app) => {
    const staleRows = app.findRecordsByFilter('customers', "lead_stage = 'expired'", '', 0, 0)
    for (const record of staleRows) {
      record.set('lead_stage', 'lost')
      app.save(record)
    }

    const collection = app.findCollectionByNameOrId('pbc_108570809')
    const stageField = collection.fields.getById('select2761645798')
    stageField.values = ['new', 'intake', 'awaiting_price', 'awaiting_payment', 'booked', 'lost']

    return app.save(collection)
  },
)
