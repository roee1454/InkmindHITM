/// <reference path="../pb_data/types.d.ts" />

// Adds google_account_email and google_account_picture fields to credentials collection (pbc_183765882)
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_183765882')

    if (!collection.fields.getById('text1000000001')) {
      collection.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text1000000001',
          max: 300,
          min: 0,
          name: 'google_account_email',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        }),
      )
    }

    if (!collection.fields.getById('text1000000002')) {
      collection.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text1000000002',
          max: 1000,
          min: 0,
          name: 'google_account_picture',
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
    const collection = app.findCollectionByNameOrId('pbc_183765882')

    collection.fields.removeById('text1000000001')
    collection.fields.removeById('text1000000002')

    return app.save(collection)
  },
)
