/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    if (!collection.fields.getById('text1000000003')) {
      collection.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text1000000003',
          max: 10000,
          min: 0,
          name: 'ai_system_instructions',
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

    collection.fields.removeById('text1000000003')

    return app.save(collection)
  },
)
