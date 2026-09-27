/**
 * A hold waiting on a human: the customer sent a transfer screenshot, and nobody has confirmed the
 * deposit yet. Only a `pending` hold counts — that is the one actually blocked on this check. A
 * confirmed, completed or cancelled appointment with an old unconfirmed screenshot is settled or
 * over, and flagging it would nag staff forever about something nobody needs to do.
 */
export function awaitsReceiptApproval(appointment: Readonly<Record<string, unknown>>): boolean {
  return appointment.status === 'pending' && Boolean(appointment.payment_receipt_url) && !appointment.deposit_paid
}
