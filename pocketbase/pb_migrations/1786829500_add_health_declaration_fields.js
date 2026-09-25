/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const appointments = app.findCollectionByNameOrId("pbc_1037645436")
  if (!appointments.fields.getByName("health_declaration_signed")) {
    appointments.fields.add(
      new Field({
        hidden: false,
        id: "bool_hd_signed_apt",
        name: "health_declaration_signed",
        presentable: false,
        required: false,
        system: false,
        type: "bool",
      })
    )
  }
  if (!appointments.fields.getByName("health_declaration_date")) {
    appointments.fields.add(
      new Field({
        hidden: false,
        id: "date_hd_date_apt",
        name: "health_declaration_date",
        presentable: false,
        required: false,
        system: false,
        type: "date",
      })
    )
  }
  if (!appointments.fields.getByName("health_declaration_url")) {
    appointments.fields.add(
      new Field({
        hidden: false,
        id: "text_hd_url_apt",
        name: "health_declaration_url",
        presentable: false,
        required: false,
        system: false,
        type: "text",
      })
    )
  }
  if (!appointments.fields.getByName("health_declaration_answers")) {
    appointments.fields.add(
      new Field({
        hidden: false,
        id: "json_hd_answers_apt",
        name: "health_declaration_answers",
        presentable: false,
        required: false,
        system: false,
        type: "json",
      })
    )
  }
  app.save(appointments)

  const customers = app.findCollectionByNameOrId("pbc_108570809")
  if (!customers.fields.getByName("health_declaration_signed")) {
    customers.fields.add(
      new Field({
        hidden: false,
        id: "bool_hd_signed_cust",
        name: "health_declaration_signed",
        presentable: false,
        required: false,
        system: false,
        type: "bool",
      })
    )
  }
  if (!customers.fields.getByName("health_declaration_date")) {
    customers.fields.add(
      new Field({
        hidden: false,
        id: "date_hd_date_cust",
        name: "health_declaration_date",
        presentable: false,
        required: false,
        system: false,
        type: "date",
      })
    )
  }
  if (!customers.fields.getByName("allergies")) {
    customers.fields.add(
      new Field({
        hidden: false,
        id: "text_allergies_cust",
        name: "allergies",
        presentable: false,
        required: false,
        system: false,
        type: "text",
      })
    )
  }
  if (!customers.fields.getByName("medical_notes")) {
    customers.fields.add(
      new Field({
        hidden: false,
        id: "text_mednotes_cust",
        name: "medical_notes",
        presentable: false,
        required: false,
        system: false,
        type: "text",
      })
    )
  }
  app.save(customers)

  const conversations = app.findCollectionByNameOrId("pbc_728114816")
  const stateField = conversations.fields.getById("select_conv_state_1")
  if (stateField && !stateField.values.includes("AWAIT_HEALTH_NOTICE")) {
    stateField.values = [
      "NEW",
      "WANTS_TO_BOOK",
      "COLLECTING_INFO",
      "WAITLIST",
      "AWAIT_PRICE_OFFER",
      "AWAIT_HEALTH_NOTICE",
      "AWAIT_PAYMENT",
      "AWAIT_FINAL_CONFIRMATION",
      "AWAITING_APPOINTMENT",
      "AWAIT_NPS_SCORE",
      "COMPLETED",
    ]
    app.save(conversations)
  }
}, (app) => {
  const appointments = app.findCollectionByNameOrId("pbc_1037645436")
  const aptFields = ["health_declaration_signed", "health_declaration_date", "health_declaration_url", "health_declaration_answers"]
  for (const name of aptFields) {
    const f = appointments.fields.getByName(name)
    if (f) appointments.fields.removeById(f.id)
  }
  app.save(appointments)

  const customers = app.findCollectionByNameOrId("pbc_108570809")
  const custFields = ["health_declaration_signed", "health_declaration_date", "allergies", "medical_notes"]
  for (const name of custFields) {
    const f = customers.fields.getByName(name)
    if (f) customers.fields.removeById(f.id)
  }
  app.save(customers)
})

