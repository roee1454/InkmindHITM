/// <reference path="../pb_data/types.d.ts" />

// Payments ledger rules (logic in ./lib/payments.js, tests in tests/integration/payments.test.ts):
// - a session can't be completed without its final price (or an explicit "no charge");
// - the legacy deposit_paid flag is mirrored into the payments ledger inside the same transaction.

onRecordUpdate((e) => {
  const payments = require(`${__hooks}/lib/payments.js`)
  payments.assertCompletionHasPrice(e.record, e.record.original())
  e.next()
}, 'appointments')

onRecordCreateExecute((e) => {
  const payments = require(`${__hooks}/lib/payments.js`)
  e.next()
  payments.mirrorDeposit(e.app, e.record, null)
}, 'appointments')

onRecordUpdateExecute((e) => {
  const payments = require(`${__hooks}/lib/payments.js`)
  const original = e.record.original()
  e.next()
  payments.mirrorDeposit(e.app, e.record, original)
}, 'appointments')
