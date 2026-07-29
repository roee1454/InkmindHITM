/// <reference path="../pb_data/types.d.ts" />

// HITL-11: audit trail for conversation-state transitions, written by
// src/features/conversations/server/state-machine.ts (including REJECTED attempts).
// Answers "who moved this conversation, when, and why" — previously unreconstructable.
migrate(
  (app) => {
    const collection = new Collection({
      id: 'pbc_1000000101',
      name: 'audit_log',
      type: 'base',
      system: false,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null, // server-only writes
      updateRule: null, // audit entries are immutable
      deleteRule: null,
      fields: [
        {
          autogeneratePattern: '[a-z0-9]{15}',
          hidden: false,
          id: 'text3208210256',
          max: 15,
          min: 15,
          name: 'id',
          pattern: '^[a-z0-9]+$',
          presentable: false,
          primaryKey: true,
          required: true,
          system: true,
          type: 'text',
        },
        {
          cascadeDelete: true,
          collectionId: 'pbc_728114816', // conversations
          hidden: false,
          id: 'relation1000000102',
          maxSelect: 1,
          minSelect: 0,
          name: 'conversation',
          presentable: false,
          required: false,
          system: false,
          type: 'relation',
        },
        { autogeneratePattern: '', hidden: false, id: 'text1000000103', max: 20, min: 0, name: 'actor', pattern: '', presentable: false, primaryKey: false, required: false, system: false, type: 'text' },
        { autogeneratePattern: '', hidden: false, id: 'text1000000104', max: 500, min: 0, name: 'reason', pattern: '', presentable: false, primaryKey: false, required: false, system: false, type: 'text' },
        { autogeneratePattern: '', hidden: false, id: 'text1000000105', max: 50, min: 0, name: 'from_state', pattern: '', presentable: false, primaryKey: false, required: false, system: false, type: 'text' },
        { autogeneratePattern: '', hidden: false, id: 'text1000000106', max: 50, min: 0, name: 'to_state', pattern: '', presentable: false, primaryKey: false, required: false, system: false, type: 'text' },
        { hidden: false, id: 'autodate1000000107', name: 'created', onCreate: true, onUpdate: false, presentable: false, system: false, type: 'autodate' },
      ],
    })

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1000000101')
    return app.delete(collection)
  },
)
