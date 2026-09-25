/// <reference path="../pb_data/types.d.ts" />

// Payment history outlives deletes (docs/architecture.md §8).
//
// payments.project used to cascade, so deleting a customer (→ their projects) silently deleted
// every payment they ever made — revenue the ledger and the analytics rely on. It now restricts:
// PocketBase refuses a delete that would take payments with it, for every caller (CRM, admin UI,
// MCP). The delete preview derives this from the schema and shows the payments as the blocker.
// Anonymizing a customer while keeping their payments comes with invoicing (Track A, A18).
migrate(
  (app) => {
    const payments = app.findCollectionByNameOrId('payments')
    payments.fields.getByName('project').cascadeDelete = false
    app.save(payments)
  },
  (app) => {
    const payments = app.findCollectionByNameOrId('payments')
    payments.fields.getByName('project').cascadeDelete = true
    app.save(payments)
  },
)
