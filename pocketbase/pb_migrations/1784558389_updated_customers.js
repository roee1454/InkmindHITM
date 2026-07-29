/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_108570809")

  // update field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "select2761645798",
    "maxSelect": 1,
    "name": "lead_stage",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "new",
      "intake",
      "awaiting_price",
      "awaiting_payment",
      "booked",
      "expired"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_108570809")

  // update field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "select2761645798",
    "maxSelect": 1,
    "name": "lead_stage",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "new",
      "intake",
      "awaiting_price",
      "awaiting_payment",
      "booked",
      "lost"
    ]
  }))

  return app.save(collection)
})
