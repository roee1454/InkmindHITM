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
        "collectionId": "pbc_829252413",
        "help": "",
        "hidden": false,
        "id": "relation1114567570",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "staff",
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
        "exceptDomains": null,
        "help": "",
        "hidden": false,
        "id": "url299528745",
        "name": "portfolio_website",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "url"
      },
      {
        "exceptDomains": null,
        "help": "",
        "hidden": false,
        "id": "url2046881775",
        "name": "portfolio_instagram",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "url"
      },
      {
        "exceptDomains": null,
        "help": "",
        "hidden": false,
        "id": "url402559608",
        "name": "portfolio_facebook",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "url"
      },
      {
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
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3709889147",
        "max": 2000,
        "min": 0,
        "name": "bio",
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
        "id": "json2732705442",
        "maxSize": 8192,
        "name": "work_hours",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
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
    ],
    "id": "pbc_1568047859",
    "indexes": [
      "CREATE UNIQUE INDEX idx_artist_profiles_staff ON artist_profiles (staff)"
    ],
    "listRule": "@request.auth.id != ''",
    "name": "artist_profiles",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1568047859");

  return app.delete(collection);
})
