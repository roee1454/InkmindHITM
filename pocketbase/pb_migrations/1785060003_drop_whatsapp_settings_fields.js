/// <reference path="../pb_data/types.d.ts" />

// WhatsApp credentials are now configured exclusively via environment variables
// (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID,
// WHATSAPP_WEBHOOK_VERIFY_TOKEN, WHATSAPP_APP_SECRET) — never through the app UI or the
// `settings` collection. These fields are dead; drop them rather than leave an unused
// parallel config path.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    collection.fields.removeById('text2223330477') // whatsapp_phone_number_id
    collection.fields.removeById('text1676042200') // whatsapp_access_token
    collection.fields.removeById('text2486966848') // whatsapp_business_account_id
    collection.fields.removeById('text2955921787') // whatsapp_webhook_verify_token
    collection.fields.removeById('text2900100003') // whatsapp_app_secret

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text2223330477',
        max: 64,
        min: 0,
        name: 'whatsapp_phone_number_id',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    )
    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: true,
        id: 'text1676042200',
        max: 4096,
        min: 0,
        name: 'whatsapp_access_token',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    )
    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text2486966848',
        max: 64,
        min: 0,
        name: 'whatsapp_business_account_id',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    )
    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: true,
        id: 'text2955921787',
        max: 200,
        min: 0,
        name: 'whatsapp_webhook_verify_token',
        pattern: '',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
      }),
    )
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

    return app.save(collection)
  },
)
