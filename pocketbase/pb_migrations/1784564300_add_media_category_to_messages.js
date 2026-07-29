/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279')

  if (!collection.fields.getById('select_media_category')) {
    collection.fields.add(
      new Field({
        id: 'select_media_category',
        name: 'media_category',
        type: 'select',
        maxSelect: 1,
        values: ['inspiration', 'verification'],
        required: false,
        hidden: false,
        system: false,
        presentable: false
      })
    )
    app.save(collection)
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_2605467279')
  collection.fields.removeById('select_media_category')
  app.save(collection)
})
