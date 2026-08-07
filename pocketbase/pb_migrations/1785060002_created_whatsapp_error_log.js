/// <reference path="../pb_data/types.d.ts" />

// Persisted WhatsApp Cloud API error log — surfaced read-only in the WhatsApp settings tab
// (dashboard + onboarding) so an admin can see webhook signature/processing failures and
// failed connection tests without needing server console access.
migrate(
  (app) => {
    const collection = new Collection({
      id: 'pbc_1000000200',
      name: 'whatsapp_error_log',
      type: 'base',
      system: false,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null, // server-only writes
      updateRule: null, // log entries are immutable
      deleteRule: null,
      fields: [
        {
          autogeneratePattern: '[a-z0-9]{15}',
          hidden: false,
          id: 'text3208210256',
          max: 15,
          min: 15,
          name: 'id',
          pattern: '^[a-z0-9]+$',
          presentable: false,
          primaryKey: true,
          required: true,
          system: true,
          type: 'text',
        },
        {
          hidden: false,
          id: 'select1000000201',
          maxSelect: 1,
          name: 'source',
          presentable: false,
          required: true,
          system: false,
          type: 'select',
          values: ['webhook_signature', 'webhook_processing', 'test_connection'],
        },
        {
          autogeneratePattern: '',
          hidden: false,
          id: 'text1000000202',
          max: 2000,
          min: 0,
          name: 'message',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: true,
          system: false,
          type: 'text',
        },
        {
          hidden: false,
          id: 'autodate1000000203',
          name: 'created',
          onCreate: true,
          onUpdate: false,
          presentable: false,
          system: false,
          type: 'autodate',
        },
      ],
    })

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1000000200')
    return app.delete(collection)
  },
)
