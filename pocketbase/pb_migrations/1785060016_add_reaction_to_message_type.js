/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2605467279')
    const typeField = collection.fields.getById('select2363381545')
    if (typeField && !typeField.values.includes('reaction')) {
      typeField.values = [...typeField.values, 'reaction']
      app.save(collection)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_2605467279')
    const typeField = collection.fields.getById('select2363381545')
    if (typeField && typeField.values.includes('reaction')) {
      typeField.values = typeField.values.filter((v) => v !== 'reaction')
      app.save(collection)
    }
  },
)

