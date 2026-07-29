/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_108570809")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_customers_phone ON customers (phone)"
    ]
  }, collection)

  // remove field
  collection.fields.removeById("relation1244334006")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_108570809")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_customers_studio_phone ON customers (studio, phone)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2819984735",
    "help": "",
    "hidden": false,
    "id": "relation1244334006",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "studio",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
