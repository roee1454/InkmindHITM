/**
 * Where a conversation goes once staff send an appointment's quote: a free consultation for a
 * customer whose health declaration is valid is simply booked; otherwise the declaration comes
 * first, then payment.
 */
export function quoteTargetState(input: {
  isSketch: boolean
  hasDeposit: boolean
  isHealthValid: boolean
}): { state: 'AWAIT_PAYMENT' | 'AWAIT_HEALTH_NOTICE' | 'AWAITING_APPOINTMENT'; reason: string } {
  if (input.isSketch && !input.hasDeposit) {
    return input.isHealthValid
      ? { state: 'AWAITING_APPOINTMENT', reason: 'sendPriceQuoteToCustomer_sketch_free_confirmed' }
      : { state: 'AWAIT_HEALTH_NOTICE', reason: 'sendPriceQuoteToCustomer_sketch_free_requires_health_declaration' }
  }
  return input.isHealthValid
    ? { state: 'AWAIT_PAYMENT', reason: 'sendPriceQuoteToCustomer_returning_customer_signed' }
    : { state: 'AWAIT_HEALTH_NOTICE', reason: 'sendPriceQuoteToCustomer_requires_health_declaration' }
}
