/// <reference path="../pb_data/types.d.ts" />

// Payments ledger and session close-out (docs/architecture.md §9).
//
// payments: every sum a customer paid (or was refunded) for a project. During the transition the
// existing `appointments.deposit_paid` flag stays the switch staff and the bot flip; the hook in
// pb_hooks/payments-ledger.pb.js mirrors it into this ledger, so the ledger is complete whichever
// path verified the deposit.
// appointments.final_price / charge_waived: what the session actually cost, entered when staff
// close it. A session or touch-up can't move to `completed` without one of them.
// Batch API: close-out writes the payments and the appointment in one transaction.
const APPOINTMENTS = 'pbc_1037645436'
const STAFF = 'pbc_829252413'

migrate(
  (app) => {
    app.save(
      new Collection({
        id: 'pbc_payments',
        name: 'payments',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'project', type: 'relation', required: true, maxSelect: 1, cascadeDelete: true, collectionId: 'pbc_projects' },
          { name: 'appointment', type: 'relation', required: false, maxSelect: 1, cascadeDelete: false, collectionId: APPOINTMENTS },
          { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['deposit', 'payment', 'refund'] },
          { name: 'method', type: 'select', required: true, maxSelect: 1, values: ['bit', 'paybox', 'cash', 'credit_card', 'bank_transfer', 'other'] },
          { name: 'amount', type: 'number', required: true, min: 0 },
          { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['pending_verification', 'verified', 'rejected', 'voided'] },
          { name: 'received_at', type: 'date', required: false },
          { name: 'verified_by', type: 'relation', required: false, maxSelect: 1, cascadeDelete: false, collectionId: STAFF },
          { name: 'verified_at', type: 'date', required: false },
          { name: 'receipt_url', type: 'text', required: false, max: 2000 },
          { name: 'note', type: 'text', required: false, max: 500 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_payments_project ON payments (project)',
          'CREATE INDEX idx_payments_appointment ON payments (appointment)',
        ],
      }),
    )

    const appointments = app.findCollectionByNameOrId(APPOINTMENTS)
    appointments.fields.add(new Field({ id: 'number_appt_final_price', name: 'final_price', type: 'number', required: false, min: 0 }))
    appointments.fields.add(new Field({ id: 'bool_appt_charge_waived', name: 'charge_waived', type: 'bool', required: false }))
    app.save(appointments)

    const settings = app.settings()
    settings.batch.enabled = true
    settings.batch.maxRequests = 50
    settings.batch.timeout = 10
    app.save(settings)

    backfillDeposits(app)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('payments'))
    const appointments = app.findCollectionByNameOrId(APPOINTMENTS)
    appointments.fields.removeById('number_appt_final_price')
    appointments.fields.removeById('bool_appt_charge_waived')
    app.save(appointments)
  },
)

// Deposits verified before the ledger existed.
function backfillDeposits(app) {
  const payments = app.findCollectionByNameOrId('pbc_payments')
  let created = 0
  for (const appointment of app.findAllRecords(APPOINTMENTS)) {
    const amount = appointment.getFloat('deposit_amount')
    if (!appointment.getBool('deposit_paid') || amount <= 0 || !appointment.getString('project')) continue
    const payment = new Record(payments)
    payment.set('project', appointment.getString('project'))
    payment.set('appointment', appointment.id)
    payment.set('kind', 'deposit')
    payment.set('method', 'other')
    payment.set('amount', amount)
    payment.set('status', 'verified')
    payment.set('verified_at', appointment.getString('updated'))
    payment.set('receipt_url', appointment.getString('payment_receipt_url'))
    payment.set('note', 'נרשם אוטומטית ממקדמה שאומתה לפני הקמת רשימת התשלומים')
    app.save(payment)
    created++
  }
  console.log(`[payments backfill] ${created} verified deposits recorded`)
}
