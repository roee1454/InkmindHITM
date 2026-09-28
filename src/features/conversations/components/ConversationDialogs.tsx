import { useQueryClient } from '@tanstack/react-query'
import { PriceQuoteSheet } from './sheets/PriceQuoteSheet'
import { ReceiptVerificationSheet } from './sheets/ReceiptVerificationSheet'
import { InspirationGalleryDialog } from './InspirationGalleryDialog'
import { ImageGalleryDialog } from '@/features/calendar/components/ImageGalleryDialog'
import { SendTemplateDialog } from './SendTemplateDialog'
import { ResumeBotDialog } from './ResumeBotDialog'
import { HealthDeclarationDialog } from '@/features/health-declaration/components/HealthDeclarationDialog'
import { CascadeDeleteDialog } from '@/features/database/components/CascadeDeleteDialog'
import type { ThreadMedia } from '../utils/thread-media'
import type { UIAppointmentSummary, UIConversation } from '../types'

/** One dialog at a time over a thread; the image viewer is separate, it opens on top of the receipt sheet. */
export type ThreadDialog = 'quote' | 'receipt' | 'gallery' | 'template' | 'resume-bot' | 'health' | 'delete'

interface ConversationDialogsProps {
  conversation: UIConversation
  appointment: UIAppointmentSummary | null
  media: ThreadMedia
  windowExpired: boolean
  open: ThreadDialog | null
  onOpenChange: (dialog: ThreadDialog | null) => void
  imageViewerUrl: string | null
  onImageViewerChange: (url: string | null) => void
  onTakeover: () => void
  isTakingOver: boolean
  onDeleted?: () => void
}

export function ConversationDialogs({
  conversation,
  appointment,
  media,
  windowExpired,
  open,
  onOpenChange,
  imageViewerUrl,
  onImageViewerChange,
  onTakeover,
  isTakingOver,
  onDeleted,
}: ConversationDialogsProps) {
  const queryClient = useQueryClient()
  const toggle = (dialog: ThreadDialog) => (isOpen: boolean) => onOpenChange(isOpen ? dialog : null)

  const handleSuccess = () => {
    onOpenChange(null)
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    queryClient.invalidateQueries({ queryKey: ['active-appointment', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  return (
    <>
      {/* Rendered when open even before the appointment loads, so an early click doesn't silently fail. */}
      {(open === 'quote' || appointment) && (
        <PriceQuoteSheet
          open={open === 'quote'}
          onOpenChange={toggle('quote')}
          appointmentId={appointment?.id ?? ''}
          appointmentType={appointment?.type}
          initialPriceMin={appointment?.priceMinIls ? String(appointment.priceMinIls) : ''}
          initialPriceMax={appointment?.priceMaxIls ? String(appointment.priceMaxIls) : ''}
          initialDeposit={appointment?.depositAmount ? String(appointment.depositAmount) : undefined}
          initialDurationMinutes={appointment?.durationMinutes}
          onSuccess={handleSuccess}
          onTakeover={onTakeover}
          isTakingOver={isTakingOver}
        />
      )}

      {appointment && (
        <ReceiptVerificationSheet
          open={open === 'receipt'}
          onOpenChange={toggle('receipt')}
          conversationId={conversation.id}
          initialAmount={appointment.depositAmount ? String(appointment.depositAmount) : ''}
          receiptImageUrl={media.latestReceiptUrl}
          onZoomImage={onImageViewerChange}
          onSuccess={handleSuccess}
          onTakeover={onTakeover}
          isTakingOver={isTakingOver}
        />
      )}

      <InspirationGalleryDialog
        open={open === 'gallery'}
        onOpenChange={toggle('gallery')}
        inspirationImages={media.inspirationImages}
        receipts={media.receipts}
      />

      <SendTemplateDialog open={open === 'template'} onOpenChange={toggle('template')} conversation={conversation} />

      <ResumeBotDialog open={open === 'resume-bot'} onOpenChange={toggle('resume-bot')} conversation={conversation} windowExpired={windowExpired} />

      <HealthDeclarationDialog
        open={open === 'health'}
        onOpenChange={toggle('health')}
        customerName={conversation.customerName}
        signed={appointment?.healthDeclarationSigned}
        date={appointment?.healthDeclarationDate}
        url={appointment?.healthDeclarationFileUrl}
        medicalNotes={appointment?.medicalNotes}
        answers={appointment?.healthDeclarationAnswers}
        allergies={appointment?.allergies}
      />

      <ImageGalleryDialog
        images={imageViewerUrl ? [imageViewerUrl] : []}
        initialIndex={0}
        open={Boolean(imageViewerUrl)}
        onOpenChange={(isOpen) => {
          if (!isOpen) onImageViewerChange(null)
        }}
      />

      <CascadeDeleteDialog
        open={open === 'delete'}
        onOpenChange={toggle('delete')}
        collection="conversations"
        id={conversation.id}
        entityName={`שיחה עם ${conversation.customerName || conversation.customerPhone}`}
        onDeleted={onDeleted}
      />
    </>
  )
}
