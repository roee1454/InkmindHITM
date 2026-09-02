/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1000000300")

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "date_last_read_at_1",
    "max": "",
    "min": "",
    "name": "last_read_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1000000300")

  // remove field
  collection.fields.removeById("date_last_read_at_1")

  return app.save(collection)
})
