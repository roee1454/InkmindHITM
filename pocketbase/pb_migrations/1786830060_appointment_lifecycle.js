/// <reference path="../pb_data/types.d.ts" />

// Appointment lifecycle facts (docs/architecture.md §9). Every status change is stamped and logged
// by pb_hooks/appointment-lifecycle.pb.js, whoever makes it, so analytics (time between stages,
// no-show and late-cancellation rates) and the studio's cancellation/refund rules can rely on real
// dates instead of `updated`.
//
// appointments:
// - status_actor / status_reason: written together with `status` by the code making the change;
//   the hook copies them into the log and clears them, so a stale value is never re-attributed.
// - status_changed_at, confirmed_at (first confirmation), completed_at, cancelled_at, cancelled_by.
// state_transitions: append-only log, keyed by entity name + id (text, not a relation) so it
// survives the record it describes and holds no personal data.
const APPOINTMENTS = 'pbc_1037645436'

const FIELDS = [
  { id: 'select_appt_status_actor', name: 'status_actor', type: 'select', maxSelect: 1, values: ['customer', 'staff', 'bot', 'system'] },
  { id: 'text_appt_status_reason', name: 'status_reason', type: 'text', max: 200 },
  { id: 'date_appt_status_changed_at', name: 'status_changed_at', type: 'date' },
  { id: 'date_appt_confirmed_at', name: 'confirmed_at', type: 'date' },
  { id: 'date_appt_completed_at', name: 'completed_at', type: 'date' },
  { id: 'date_appt_cancelled_at', name: 'cancelled_at', type: 'date' },
  { id: 'select_appt_cancelled_by', name: 'cancelled_by', type: 'select', maxSelect: 1, values: ['customer', 'studio', 'system'] },
]

migrate(
  (app) => {
    const appointments = app.findCollectionByNameOrId(APPOINTMENTS)
    for (const field of FIELDS) {
      appointments.fields.add(new Field({ required: false, hidden: false, presentable: false, system: false, ...field }))
    }
    app.save(appointments)

    return app.save(
      new Collection({
        id: 'pbc_state_transitions',
        name: 'state_transitions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'entity', type: 'select', required: true, maxSelect: 1, values: ['appointments', 'projects', 'conversations', 'payments', 'invoices'] },
          { name: 'entity_id', type: 'text', required: true, max: 64 },
          { name: 'from', type: 'text', required: false, max: 64 },
          { name: 'to', type: 'text', required: true, max: 64 },
          { name: 'actor', type: 'text', required: false, max: 32 },
          { name: 'reason', type: 'text', required: false, max: 200 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: [
          'CREATE INDEX idx_state_transitions_entity ON state_transitions (entity, entity_id)',
          'CREATE INDEX idx_state_transitions_created ON state_transitions (created)',
        ],
      }),
    )
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('state_transitions'))
    const appointments = app.findCollectionByNameOrId(APPOINTMENTS)
    for (const field of FIELDS) appointments.fields.removeById(field.id)
    app.save(appointments)
  },
)
