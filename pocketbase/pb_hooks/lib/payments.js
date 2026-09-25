/// <reference path="../../pb_data/types.d.ts" />

// Shared logic for pb_hooks/payments-ledger.pb.js. Covered by tests/integration/payments.test.ts.

const COMPLETION_REQUIRES_FINAL_PRICE = 'integrity:completion_requires_final_price'
const BILLABLE_KINDS = { session: true, touch_up: true }

function pbNow() {
  return new Date().toISOString().replace('T', ' ')
}

/**
 * A session or touch-up moves to `completed` only together with what it cost: a final price, or an
 * explicit "no charge". Consultations may complete without one. Records created as completed
 * (entering history after the fact) are left alone; the rule guards the transition.
 */
function assertCompletionHasPrice(record, original) {
  if (!original) return
  if (record.getString('status') !== 'completed' || original.getString('status') === 'completed') return
  if (!BILLABLE_KINDS[record.getString('kind')]) return
  if (record.getFloat('final_price') > 0 || record.getBool('charge_waived')) return
  throw new BadRequestError(COMPLETION_REQUIRES_FINAL_PRICE)
}

function verifiedDepositsOf(app, appointmentId) {
  return app.findRecordsByFilter('payments', "appointment = {:id} && kind = 'deposit' && status = 'verified'", '', 50, 0, {
    id: appointmentId,
  })
}

/**
 * Mirrors the legacy `deposit_paid` flag into the payments ledger: flipping it on records the
 * deposit, flipping it off voids it, and editing the amount of a verified deposit follows. Must run
 * after the appointment row exists (the payment references it).
 */
function mirrorDeposit(app, record, original) {
  const paidNow = record.getBool('deposit_paid')
  const paidBefore = original ? original.getBool('deposit_paid') : false
  const amount = record.getFloat('deposit_amount')
  const projectId = record.getString('project')
  if (!projectId) return

  if (paidNow && !paidBefore) {
    if (amount <= 0) return
    const payment = new Record(app.findCollectionByNameOrId('payments'))
    payment.set('project', projectId)
    payment.set('appointment', record.id)
    payment.set('kind', 'deposit')
    payment.set('method', 'other')
    payment.set('amount', amount)
    payment.set('status', 'verified')
    payment.set('received_at', pbNow())
    payment.set('verified_at', pbNow())
    payment.set('receipt_url', record.getString('payment_receipt_url'))
    app.save(payment)
    return
  }

  if (!paidNow && paidBefore) {
    for (const payment of verifiedDepositsOf(app, record.id)) {
      payment.set('status', 'voided')
      app.save(payment)
    }
    return
  }

  if (paidNow && original && amount !== original.getFloat('deposit_amount') && amount > 0) {
    for (const payment of verifiedDepositsOf(app, record.id)) {
      payment.set('amount', amount)
      app.save(payment)
    }
  }
}

module.exports = { assertCompletionHasPrice, mirrorDeposit, COMPLETION_REQUIRES_FINAL_PRICE }
