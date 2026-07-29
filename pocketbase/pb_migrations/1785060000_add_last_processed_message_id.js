/// <reference path="../pb_data/types.d.ts" />

// FLOW-9: the bot's inbound-message dedup guard, persisted per conversation.
// Replaces an in-memory Map in agent.server.ts that forgot everything on restart.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_728114816') // conversations

    if (!collection.fields.getById('text1000000010')) {
      collection.fields.add(
        new Field({
          autogeneratePattern: '',
          hidden: false,
          id: 'text1000000010',
          max: 100,
          min: 0,
          name: 'last_processed_message_id',
          pattern: '',
          presentable: false,
          primaryKey: false,
          required: false,
          system: false,
          type: 'text',
        }),
      )
    }

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_728114816')

    collection.fields.removeById('text1000000010')

    return app.save(collection)
  },
)
