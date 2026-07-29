/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1568047859")

  // remove field
  collection.fields.removeById("select797133326")

  // add field
  collection.fields.addAt(9, new Field({
    "help": "",
    "hidden": false,
    "id": "json797133326",
    "maxSize": 8192,
    "name": "tattoo_styles",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1568047859")

  // add field
  collection.fields.addAt(5, new Field({
    "help": "",
    "hidden": false,
    "id": "select797133326",
    "maxSelect": 12,
    "name": "tattoo_styles",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "fine_line",
      "traditional",
      "neo_traditional",
      "realism",
      "blackwork",
      "japanese",
      "geometric",
      "watercolor",
      "tribal",
      "lettering",
      "minimalist",
      "portrait"
    ]
  }))

  // remove field
  collection.fields.removeById("json797133326")

  return app.save(collection)
})
