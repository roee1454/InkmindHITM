/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Add 'seen' field to messages collection
  const messagesCollection = app.findCollectionByNameOrId('pbc_2605467279')
  if (!messagesCollection.fields.getById('bool2900200001')) {
    messagesCollection.fields.add(
      new Field({
        hidden: false,
        id: 'bool2900200001',
        name: 'seen',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'bool',
      })
    )
    app.save(messagesCollection)
  }

  // 2. Create notifications collection
  const notificationsCollection = new Collection({
    "id": "pbc_1122334455",
    "name": "notifications",
    "type": "base",
    "system": false,
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "createRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
    "indexes": [],
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1122000001",
        "max": 500,
        "min": 1,
        "name": "title",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1122000002",
        "max": 4000,
        "min": 1,
        "name": "message",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select112200003",
        "maxSelect": 1,
        "name": "type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "info",
          "warning",
          "error",
          "success"
        ]
      },
      {
        "hidden": false,
        "id": "bool1122000004",
        "name": "read",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1122000005",
        "max": 1000,
        "min": 0,
        "name": "link",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ]
  });

  return app.save(notificationsCollection)
}, (app) => {
  // Rollback 'seen' field
  const messagesCollection = app.findCollectionByNameOrId('pbc_2605467279')
  messagesCollection.fields.removeById('bool2900200001')
  app.save(messagesCollection)

  // Delete notifications collection
  const notificationsCollection = app.findCollectionByNameOrId("pbc_1122334455")
  return app.delete(notificationsCollection)
})
