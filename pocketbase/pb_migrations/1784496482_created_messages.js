/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
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
        "cascadeDelete": false,
        "collectionId": "pbc_728114816",
        "help": "",
        "hidden": false,
        "id": "relation2324571881",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "conversation",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
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
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text613259226",
        "max": 200,
        "min": 0,
        "name": "whatsapp_message_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select1045090739",
        "maxSelect": 1,
        "name": "direction",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "inbound",
          "outbound"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "select1932829178",
        "maxSelect": 1,
        "name": "sender_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "customer",
          "ai_bot",
          "staff"
        ]
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_829252413",
        "help": "",
        "hidden": false,
        "id": "relation1565235722",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "sender_staff",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2363381545",
        "maxSelect": 1,
        "name": "type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "text",
          "image",
          "audio",
          "document",
          "template",
          "interactive"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3685223346",
        "max": 8192,
        "min": 0,
        "name": "body",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "file1781309708",
        "maxSelect": 1,
        "maxSize": 0,
        "mimeTypes": null,
        "name": "media",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "sent",
          "delivered",
          "read",
          "failed"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "date2782324286",
        "max": "",
        "min": "",
        "name": "timestamp",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
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
      }
    ],
    "id": "pbc_2605467279",
    "indexes": [
      "CREATE UNIQUE INDEX idx_messages_wa_id ON messages (whatsapp_message_id)"
    ],
    "listRule": "@request.auth.id != ''",
    "name": "messages",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2605467279");

  return app.delete(collection);
})
