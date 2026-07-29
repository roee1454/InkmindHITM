/// <reference path="../pb_data/types.d.ts" />

// AI agent hardening pass: `record_nps_score` needs somewhere to persist the client's actual
// 1-10 answer (only `nps_sent_at` existed before — a "was it sent" timestamp, no score field).
//
// A DB-level partial unique index on (staff, start_time) WHERE status IN (...) was considered
// as a backstop against double-booking, but PocketBase's index validator in this version
// rejects partial (WHERE-clause) indexes, and a non-partial unique index would incorrectly
// block rebooking a slot after its prior appointment was (soft-)cancelled. The concurrency
// guard for booking mutations is therefore app-level only: a per-staff async lock
// (src/lib/async-lock.ts) around the check-then-create sequence in bot-appointments.ts.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1037645436')

    if (!collection.fields.getById('number_nps_score_1')) {
      collection.fields.add(
        new Field({
          hidden: false,
          id: 'number_nps_score_1',
          max: 10,
          min: 1,
          name: 'nps_score',
          onlyInt: true,
          presentable: false,
          required: false,
          system: false,
          type: 'number',
        }),
      )
    }

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1037645436')

    collection.fields.removeById('number_nps_score_1')

    return app.save(collection)
  },
)
