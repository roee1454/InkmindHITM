/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4180340331")

  // update field current_appointment to required: false, minSelect: 0
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1037645436",
    "help": "",
    "hidden": false,
    "id": "relation1089229725",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "current_appointment",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4180340331")

  // revert to required: true, minSelect: 1
  collection.fields.addAt(2, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1037645436",
    "help": "",
    "hidden": false,
    "id": "relation1089229725",
    "maxSelect": 1,
    "minSelect": 1,
    "name": "current_appointment",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})

