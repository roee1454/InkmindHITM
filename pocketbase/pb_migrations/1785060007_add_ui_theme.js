/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244') // settings

    collection.fields.add(
      new Field({
        autogeneratePattern: '',
        hidden: false,
        id: 'text1785060007',
        max: 32,
        min: 0,
        name: 'ui_theme',
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
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2769025244')

    collection.fields.removeById('text1785060007')

    return app.save(collection)
  },
)
