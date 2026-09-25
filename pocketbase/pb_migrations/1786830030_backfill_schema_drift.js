/// <reference path="../pb_data/types.d.ts" />

// Backfills three fields that long-lived dev databases have but no migration ever created:
// 1786829510_add_health_declaration_url_to_customers.js was committed as an empty file, and
// appointments.lifecycle_sent / customers.health_declaration_answers were added by hand. A fresh
// install (a new production deploy, CI, the integration-test PocketBase) therefore came up
// without them. Field ids match the hand-made ones so existing databases are left untouched.
migrate(
  (app) => {
    const customers = app.findCollectionByNameOrId('pbc_108570809')

    if (!customers.fields.getByName('health_declaration_url')) {
      customers.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text_hd_url_cust',
          max: 0,
          min: 0,
          name: 'health_declaration_url',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        }),
      )
    }

    if (!customers.fields.getByName('health_declaration_answers')) {
      customers.fields.add(
        new Field({
          hidden: false,
          id: 'json_hd_answers_cust',
          maxSize: 0,
          name: 'health_declaration_answers',
          presentable: false,
          required: false,
          system: false,
          type: 'json',
        }),
      )
    }

    app.save(customers)

    const appointments = app.findCollectionByNameOrId('pbc_1037645436')

    if (!appointments.fields.getByName('lifecycle_sent')) {
      appointments.fields.add(
        new Field({
          hidden: false,
          id: 'json_lifecycle_sent_1',
          maxSize: 8192,
          name: 'lifecycle_sent',
          presentable: false,
          required: false,
          system: false,
          type: 'json',
        }),
      )
    }

    return app.save(appointments)
  },
  () => {
    // Intentionally a no-op: on existing databases these fields predate this migration and hold
    // real data, so rolling back must not drop them.
  },
)
