/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const conversations = app.findCollectionByNameOrId("pbc_728114816")
  if (!conversations.fields.getByName("booking_session_started_at")) {
    conversations.fields.add(
      new Field({
        hidden: false,
        id: "date_booking_sess_start",
        name: "booking_session_started_at",
        presentable: false,
        required: false,
        system: false,
        type: "date",
      })
    )
    app.save(conversations)
  }

  const messages = app.findCollectionByNameOrId("pbc_2605467279")
  if (!messages.fields.getByName("appointment")) {
    messages.fields.add(
      new Field({
        cascadeDelete: false,
        collectionId: "pbc_1037645436",
        hidden: false,
        id: "relation_msg_apt",
        maxSelect: 1,
        minSelect: 0,
        name: "appointment",
        presentable: false,
        required: false,
        system: false,
        type: "relation",
      })
    )
    app.save(messages)
  }
}, (app) => {
  const conversations = app.findCollectionByNameOrId("pbc_728114816")
  const sessField = conversations.fields.getByName("booking_session_started_at")
  if (sessField) conversations.fields.removeById(sessField.id)
  app.save(conversations)

  const messages = app.findCollectionByNameOrId("pbc_2605467279")
  const aptField = messages.fields.getByName("appointment")
  if (aptField) messages.fields.removeById(aptField.id)
  app.save(messages)
})

