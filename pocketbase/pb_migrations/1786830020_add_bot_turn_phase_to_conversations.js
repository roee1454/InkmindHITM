/// <reference path="../pb_data/types.d.ts" />

// Ephemeral CRM-only signal for the BullMQ conversation-turn queue: '' = idle, "cooldown" =
// the 10s inbound-message debounce window is open, "typing" = the queue job (transcription +
// AI generation + send) is actually running. Written/cleared by webhook.ts and
// src/lib/queue/conversation-turn-worker.ts; read by ConversationMessages.tsx.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_728114816') // conversations

    if (!collection.fields.getById('select_bot_turn_phase')) {
      collection.fields.add(
        new Field({
          hidden: false,
          id: 'select_bot_turn_phase',
          maxSelect: 1,
          name: 'bot_turn_phase',
          presentable: false,
          required: false,
          system: false,
          type: 'select',
          values: ['cooldown', 'typing'],
        }),
      )
    }

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_728114816')

    collection.fields.removeById('select_bot_turn_phase')

    return app.save(collection)
  },
)
