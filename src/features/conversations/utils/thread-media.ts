import type { ReceiptEntry } from '../components/InspirationGalleryDialog'
import type { UIAppointmentSummary, UIConversation, UIMessage } from '../types'
import { messageMediaUrl } from './media'

export interface ThreadMedia {
  inspirationImages: string[]
  receipts: ReceiptEntry[]
  /** The newest receipt: what the payment panel shows and the verification sheet opens. */
  latestReceiptUrl?: string
}

/** Sorts the thread's images into inspiration and payment receipts. */
export function collectThreadMedia(
  messages: UIMessage[],
  appointment: UIAppointmentSummary | null,
  conversation: Pick<UIConversation, 'state' | 'staffCallReason'>,
): ThreadMedia {
  const inspirationImages: string[] = []
  const receipts: ReceiptEntry[] = []
  // While a deposit is due, any image the customer sends is a receipt candidate: the webhook may
  // not have tagged it `verification` yet.
  const awaitingPayment = conversation.state === 'AWAIT_PAYMENT' || conversation.staffCallReason === 'receipt_verification'

  for (const m of messages) {
    if (!m.mediaFilename) continue
    const url = messageMediaUrl(m.id, m.mediaFilename)
    if (m.mediaCategory === 'verification' || (m.type === 'image' && m.direction === 'inbound' && awaitingPayment)) {
      receipts.push({ url, timestamp: m.timestamp })
    } else if (m.type === 'image') {
      inspirationImages.push(url)
    }
  }

  if (receipts.length === 0 && appointment?.paymentReceiptUrl) {
    receipts.push({ url: appointment.paymentReceiptUrl, timestamp: appointment.createdAt || '' })
  }

  return { inspirationImages, receipts, latestReceiptUrl: receipts.at(-1)?.url }
}
