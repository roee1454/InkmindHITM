/// <reference path="../pb_data/types.d.ts" />

// Security fix: the webhook POST handler (src/routes/api/whatsapp-webhook.ts) never verified
// Meta's X-Hub-Signature-256 header, so any internet client could forge inbound WhatsApp
// messages. Verifying that signature requires the WhatsApp App Secret (distinct from the
// access token and the webhook verify token) — this field stores it, hidden like the other
// secrets on this collection. Idempotent — safe to re-run against an already-patched instance.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    if (!collection.fields.getById('text2900100003')) {
      collection.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: true,
          id: 'text2900100003',
          max: 200,
          min: 0,
          name: 'whatsapp_app_secret',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        }),
      )
    }

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    collection.fields.removeById('text2900100003')

    return app.save(collection)
  },
)
