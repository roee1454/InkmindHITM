import { useQueryClient } from '@tanstack/react-query'
import { PriceQuoteSheet } from './sheets/PriceQuoteSheet'
import { ReceiptVerificationSheet } from './sheets/ReceiptVerificationSheet'
import { InspirationGalleryDialog } from './InspirationGalleryDialog'
import type { ReceiptEntry } from './InspirationGalleryDialog'
import { ImageGalleryDialog } from '@/features/calendar/components/ImageGalleryDialog'
import { SendTemplateDialog } from './SendTemplateDialog'
import { ResumeBotDialog } from './ResumeBotDialog'
import type { UIAppointmentSummary, UIConversation } from '../types'
import { CascadeDeleteDialog } from '@/features/database/components/CascadeDeleteDialog'

interface ConversationDialogsProps {
  conversation: UIConversation
  appointment: UIAppointmentSummary | null
  windowExpired: boolean
  priceQuoteOpen: boolean
  onPriceQuoteOpenChange: (open: boolean) => void
  receiptOpen: boolean
  onReceiptOpenChange: (open: boolean) => void
  receiptImageUrl?: string
  inspirationImages: string[]
  receipts: ReceiptEntry[]
  galleryOpen: boolean
  onGalleryOpenChange: (open: boolean) => void
  sendTemplateOpen: boolean
  onSendTemplateOpenChange: (open: boolean) => void
  resumeBotOpen: boolean
  onResumeBotOpenChange: (open: boolean) => void
  imageViewerUrl: string | null
  onOpenImageViewer: (url: string) => void
  onCloseImageViewer: () => void
  onTakeover: () => void
  isTakingOver?: boolean
  deleteOpen: boolean
  onDeleteOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function ConversationDialogs({
  conversation,
  appointment,
  windowExpired,
  priceQuoteOpen,
  onPriceQuoteOpenChange,
  receiptOpen,
  onReceiptOpenChange,
  receiptImageUrl,
  inspirationImages,
  receipts,
  galleryOpen,
  onGalleryOpenChange,
  sendTemplateOpen,
  onSendTemplateOpenChange,
  resumeBotOpen,
  onResumeBotOpenChange,
  imageViewerUrl,
  onOpenImageViewer,
  onCloseImageViewer,
  onTakeover,
  isTakingOver = false,
  deleteOpen,
  onDeleteOpenChange,
  onDeleted,
}: ConversationDialogsProps) {
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['active-appointment', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  return (
    <>
      {/* PriceQuoteSheet must render when open=true even if appointment is still null,
          so clicking the button before the appointment query resolves doesn't silently fail. */}
      {(priceQuoteOpen || appointment) && (
        <PriceQuoteSheet
          open={priceQuoteOpen}
          onOpenChange={onPriceQuoteOpenChange}
          appointmentId={appointment?.id ?? ''}
          appointmentType={appointment?.type}
          initialPriceMin={appointment?.priceMinIls ? String(appointment.priceMinIls) : ''}
          initialPriceMax={appointment?.priceMaxIls ? String(appointment.priceMaxIls) : ''}
          initialDeposit={appointment?.depositAmount ? String(appointment.depositAmount) : undefined}
          initialDurationMinutes={appointment?.durationMinutes}
          onSuccess={() => {
            onPriceQuoteOpenChange(false)
            handleSuccess()
          }}
          onTakeover={onTakeover}
          isTakingOver={isTakingOver}
        />
      )}

      {appointment && (
        <ReceiptVerificationSheet
          open={receiptOpen}
          onOpenChange={onReceiptOpenChange}
          conversationId={conversation.id}
          initialAmount={appointment?.depositAmount ? String(appointment.depositAmount) : ''}
          receiptImageUrl={receiptImageUrl}
          onZoomImage={onOpenImageViewer}
          onSuccess={() => {
            onReceiptOpenChange(false)
            handleSuccess()
          }}
          onTakeover={onTakeover}
          isTakingOver={isTakingOver}
        />
      )}

      <InspirationGalleryDialog
        open={galleryOpen}
        onOpenChange={onGalleryOpenChange}
        inspirationImages={inspirationImages}
        receipts={receipts}
      />

      <SendTemplateDialog
        open={sendTemplateOpen}
        onOpenChange={onSendTemplateOpenChange}
        conversation={conversation}
      />

      <ResumeBotDialog
        open={resumeBotOpen}
        onOpenChange={onResumeBotOpenChange}
        conversation={conversation}
        windowExpired={windowExpired}
      />

      <ImageGalleryDialog
        images={imageViewerUrl ? [imageViewerUrl] : []}
        initialIndex={0}
        open={Boolean(imageViewerUrl)}
        onOpenChange={(open) => {
          if (!open) onCloseImageViewer()
        }}
      />

      <CascadeDeleteDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        collection="conversations"
        id={conversation.id}
        entityName={`שיחה עם ${conversation.customerName || conversation.customerPhone}`}
        onDeleted={onDeleted}
      />
    </>
  )
}
