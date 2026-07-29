/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2769025244")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  // remove field
  collection.fields.removeById("relation1244334006")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2769025244")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_settings_studio ON settings (studio)"
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
