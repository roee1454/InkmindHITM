/// <reference path="../pb_data/types.d.ts" />

// Moves referential integrity into PocketBase (see docs/architecture.md §8):
//
// 1. Relation policies. Deleting a parent now cascades inside PocketBase's own transaction instead
//    of a hand-rolled, non-atomic loop of HTTP deletes in the Node server:
//      messages.conversation, conversations.customer, appointments.customer, credentials.staff
//    become cascadeDelete. audit_log.conversation stops cascading (it's optional, so PocketBase
//    unsets it) — the audit trail outlives the conversation it describes.
//    Optional relations without cascade (appointments.staff, conversations.assigned_staff, …) are
//    already unset by PocketBase itself when their target is deleted.
//
// 2. integration_outbox — side effects that live outside the database (today: deleting the
//    synced Google Calendar event of a deleted appointment). Rows are written by
//    pb_hooks/data-integrity.pb.js inside the delete's transaction, so a rolled-back delete leaves
//    no row and a committed one always does; the Node worker
//    (src/features/database/server/integration-outbox.server.ts) drains them with retries.
//
// 3. deletion_log — who deleted what, with a display-name snapshot. No message content is kept.
const RELATION_POLICIES = [
  { collectionId: 'pbc_2605467279', field: 'conversation', cascade: true }, // messages
  { collectionId: 'pbc_728114816', field: 'customer', cascade: true }, // conversations
  { collectionId: 'pbc_1037645436', field: 'customer', cascade: true }, // appointments
  { collectionId: 'pbc_183765882', field: 'staff', cascade: true }, // credentials
  { collectionId: 'pbc_1000000101', field: 'conversation', cascade: false }, // audit_log
]

const PREVIOUS_POLICIES = [
  { collectionId: 'pbc_2605467279', field: 'conversation', cascade: false },
  { collectionId: 'pbc_728114816', field: 'customer', cascade: false },
  { collectionId: 'pbc_1037645436', field: 'customer', cascade: false },
  { collectionId: 'pbc_183765882', field: 'staff', cascade: false },
  { collectionId: 'pbc_1000000101', field: 'conversation', cascade: true },
]

function applyRelationPolicies(app, policies) {
  for (const policy of policies) {
    const collection = app.findCollectionByNameOrId(policy.collectionId)
    const field = collection.fields.getByName(policy.field)
    if (!field) throw new Error(`missing relation ${collection.name}.${policy.field}`)
    field.cascadeDelete = policy.cascade
    app.save(collection)
  }
}

function autodate(name, onUpdate) {
  return { hidden: false, name, onCreate: true, onUpdate, presentable: false, system: false, type: 'autodate' }
}

migrate(
  (app) => {
    applyRelationPolicies(app, RELATION_POLICIES)

    app.save(
      new Collection({
        id: 'pbc_integration_outbox',
        name: 'integration_outbox',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['gcal_delete_event'] },
          { name: 'payload', type: 'json', required: true, maxSize: 0 },
          { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['pending', 'done', 'failed'] },
          { name: 'attempts', type: 'number', required: false, onlyInt: true, min: 0 },
          { name: 'last_error', type: 'text', required: false, max: 2000 },
          { name: 'available_at', type: 'date', required: true },
          { name: 'processed_at', type: 'date', required: false },
          autodate('created', false),
          autodate('updated', true),
        ],
        indexes: ['CREATE INDEX idx_integration_outbox_due ON integration_outbox (status, available_at)'],
      }),
    )

    return app.save(
      new Collection({
        id: 'pbc_deletion_log',
        name: 'deletion_log',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'target_collection', type: 'text', required: true, max: 64 },
          { name: 'target_id', type: 'text', required: true, max: 64 },
          { name: 'label', type: 'text', required: false, max: 300 },
          {
            name: 'actor',
            type: 'relation',
            required: false,
            maxSelect: 1,
            cascadeDelete: false,
            collectionId: 'pbc_829252413', // staff
          },
          { name: 'impact', type: 'json', required: false, maxSize: 0 },
          autodate('created', false),
        ],
        indexes: ['CREATE INDEX idx_deletion_log_target ON deletion_log (target_collection, target_id)'],
      }),
    )
  },
  (app) => {
    for (const name of ['deletion_log', 'integration_outbox']) {
      const collection = app.findCollectionByNameOrId(name)
      app.delete(collection)
    }
    applyRelationPolicies(app, PREVIOUS_POLICIES)
  },
)
