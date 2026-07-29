/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_728114816")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_conversations_customer ON conversations (customer)"
    ]
  }, collection)

  // remove field
  collection.fields.removeById("relation1244334006")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_728114816")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX idx_conversations_studio_customer ON conversations (studio, customer)"
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
