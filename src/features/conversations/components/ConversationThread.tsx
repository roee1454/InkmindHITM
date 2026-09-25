import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMessages,
  sendMessage,
  markConversationAsSeen,
  takeOverConversation,
  getActiveAppointmentSummary,
} from '../server/messages'
import { ConversationMessages } from './ConversationMessages'
import { ConversationActionDock } from './ConversationActionDock'
import { ConversationHeader } from './ConversationHeader'
import { ConversationComposer } from './ConversationComposer'
import { ConversationDialogs } from './ConversationDialogs'
import type { ReceiptEntry } from './InspirationGalleryDialog'
import { useConversationsUiStore } from '../store/conversationsUiStore'
import { formatWindowRemaining } from '../utils/format'
import { messageMediaUrl } from '../utils/media'
import { isAwaitingCustomerAction } from '../utils/labels'
import type { UIAppointmentSummary, UIConversation, UIMessage } from '../types'
import { HealthDeclarationDialog } from '@/features/health-declaration/components/HealthDeclarationDialog'

export function ConversationThread({
  conversation,
  onBack,
  onDeleted,
}: {
  conversation: UIConversation
  onBack?: () => void
  /** Called after this conversation was deleted from its own menu, to leave the dead thread. */
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()
  const {
    draft,
    replyingTo,
    selectedFile,
    messagesLimit,
    setDraft,
    setReplyingTo,
    setSelectedFile,
    setMessagesLimit,
    resetThread,
  } = useConversationsUiStore()

  useEffect(() => {
    resetThread()
  }, [conversation.id, resetThread])

  const [, forceTick] = useState(0)
  useEffect(() => {
    const interval = window.setInterval(() => forceTick((n) => n + 1), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const windowInfo = formatWindowRemaining(conversation.windowExpiresAt)
  const windowExpired = windowInfo.status === 'expired'

  const { data: appointment = null } = useQuery<UIAppointmentSummary | null>({
    queryKey: ['active-appointment', conversation.id],
    queryFn: () => getActiveAppointmentSummary({ data: { conversationId: conversation.id } }),
    enabled: Boolean(conversation.id),
  })

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', conversation.id, messagesLimit],
    queryFn: () =>
      listMessages({
        data: { conversationId: conversation.id, limit: messagesLimit },
      }),
    refetchInterval: 30000,
  })

  const messages = messagesData?.messages ?? []
  const hasMore = messagesData?.hasMore ?? false

  useEffect(() => {
    if (messages.length > 0) {
      void markConversationAsSeen({ data: { conversationId: conversation.id } }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      })
    }
  }, [conversation.id, messages.length, queryClient])

  const sendMutation = useMutation({
    mutationFn: async () => {
      let mediaData: { filename: string; mimeType: string; base64: string } | undefined
      if (selectedFile) {
        mediaData = {
          filename: selectedFile.filename,
          mimeType: selectedFile.mimeType,
          base64: selectedFile.base64,
        }
      }

      return sendMessage({
        data: {
          conversationId: conversation.id,
          body: draft,
          replyToWamid: replyingTo?.whatsappMessageId || undefined,
          mediaData,
        },
      })
    },
    onSuccess: (newMsg) => {
      setDraft('')
      setSelectedFile(null)
      setReplyingTo(null)
      queryClient.setQueryData(
        ['messages', conversation.id, messagesLimit],
        (old: { messages: UIMessage[]; hasMore: boolean } | undefined) => {
          if (!old) return { messages: [newMsg], hasMore: false }
          return { ...old, messages: [...old.messages, newMsg] }
        },
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const takeOverMutation = useMutation({
    mutationFn: () => takeOverConversation({ data: { conversationId: conversation.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  // Dialog & Sheet States
  const [priceQuoteOpen, setPriceQuoteOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [sendTemplateOpen, setSendTemplateOpen] = useState(false)
  const [resumeBotOpen, setResumeBotOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null)
  const [healthDeclarationOpen, setHealthDeclarationOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { inspirationImages, receipts, receiptImageUrl } = useMemo(() => {
    const insp: string[] = []
    const receiptEntries: ReceiptEntry[] = []
    let lastReceiptUrl: string | undefined

    const isAwaitingPayment =
      conversation.state === 'AWAIT_PAYMENT' ||
      conversation.staffCallReason === 'receipt_verification'

    messages.forEach((m) => {
      if (m.mediaFilename) {
        const url = messageMediaUrl(m.id, m.mediaFilename)
        if (m.mediaCategory === 'verification') {
          receiptEntries.push({ url, timestamp: m.timestamp })
          lastReceiptUrl = url
        } else if (m.type === 'image' && m.direction === 'inbound' && isAwaitingPayment) {
          // Fallback: in AWAIT_PAYMENT, any inbound image is a receipt candidate
          // (webhook may not tag media_category='verification' immediately)
          receiptEntries.push({ url, timestamp: m.timestamp })
          lastReceiptUrl = url
        } else if (m.type === 'image') {
          insp.push(url)
        }
      }
    })

    if (!lastReceiptUrl && appointment?.paymentReceiptUrl) {
      lastReceiptUrl = appointment.paymentReceiptUrl
      receiptEntries.push({ url: lastReceiptUrl, timestamp: appointment.createdAt || '' })
    }

    return {
      inspirationImages: insp,
      receipts: receiptEntries,
      receiptImageUrl: lastReceiptUrl,
    }
  }, [messages, appointment, conversation.state, conversation.staffCallReason])

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-background font-assistant" dir="rtl">
      {/* Header */}
      <ConversationHeader
        conversation={conversation}
        appointment={appointment}
        windowInfo={windowInfo}
        windowExpired={windowExpired}
        onBack={onBack}
        onTakeOver={() => takeOverMutation.mutate()}
        onResumeBot={() => setResumeBotOpen(true)}
        onOpenInspiration={() => setGalleryOpen(true)}
        onOpenSendTemplate={() => setSendTemplateOpen(true)}
        onOpenHealthDeclaration={() => setHealthDeclarationOpen(true)}
        onDeleteConversation={() => setDeleteOpen(true)}
        isTakingOver={takeOverMutation.isPending}
      />

      {/* Messages Scroll Area */}
      <ConversationMessages
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={() => setMessagesLimit(messagesLimit + 50)}
        onReply={(m) => setReplyingTo(m)}
        onImageClick={(url) => setImageViewerUrl(url)}
        appointment={appointment}
        conversation={conversation}
      />

      {/* HITL Action Dock */}
      <ConversationActionDock
        conversation={conversation}
        appointment={appointment}
        receiptImageUrl={receiptImageUrl}
        onOpenQuoteSheet={() => setPriceQuoteOpen(true)}
        onOpenReceiptSheet={() => setReceiptOpen(true)}
        onResumeBot={() => setResumeBotOpen(true)}
      />

      {/* Composer */}
      {(() => {
        const isAwaitingCustomer = isAwaitingCustomerAction(conversation.state)
        const awaitingNotice =
          conversation.state === 'AWAIT_HEALTH_NOTICE'
            ? 'לא ניתן להקליד כרגע (ממתין למילוי הצהרת בריאות על ידי הלקוח)'
            : conversation.state === 'AWAIT_FINAL_CONFIRMATION'
              ? 'לא ניתן להקליד כרגע (ממתין לאישור סופי של התור על ידי הלקוח)'
              : undefined

        return (
          <ConversationComposer
            customerName={conversation.customerName}
            customerPhone={conversation.customerPhone}
            draft={draft}
            onDraftChange={setDraft}
            onSend={() => sendMutation.mutate()}
            isSending={sendMutation.isPending}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            windowExpired={windowExpired}
            onOpenSendTemplate={() => setSendTemplateOpen(true)}
            isAwaitingCustomer={isAwaitingCustomer}
            awaitingNotice={awaitingNotice}
          />
        )
      })()}

      {/* Sheets & Dialogs */}
      <ConversationDialogs
        conversation={conversation}
        appointment={appointment}
        windowExpired={windowExpired}
        priceQuoteOpen={priceQuoteOpen}
        onPriceQuoteOpenChange={setPriceQuoteOpen}
        receiptOpen={receiptOpen}
        onReceiptOpenChange={setReceiptOpen}
        receiptImageUrl={receiptImageUrl}
        inspirationImages={inspirationImages}
        receipts={receipts}
        galleryOpen={galleryOpen}
        onGalleryOpenChange={setGalleryOpen}
        sendTemplateOpen={sendTemplateOpen}
        onSendTemplateOpenChange={setSendTemplateOpen}
        resumeBotOpen={resumeBotOpen}
        onResumeBotOpenChange={setResumeBotOpen}
        imageViewerUrl={imageViewerUrl}
        onOpenImageViewer={(url) => setImageViewerUrl(url)}
        onCloseImageViewer={() => setImageViewerUrl(null)}
        onTakeover={() => takeOverMutation.mutate()}
        isTakingOver={takeOverMutation.isPending}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />

      {/* Health Declaration Dialog */}
      <HealthDeclarationDialog
        open={healthDeclarationOpen}
        onOpenChange={setHealthDeclarationOpen}
        customerName={conversation.customerName}
        signed={appointment?.healthDeclarationSigned}
        date={appointment?.healthDeclarationDate}
        url={appointment?.healthDeclarationFileUrl}
        medicalNotes={appointment?.medicalNotes}
        answers={appointment?.healthDeclarationAnswers}
        allergies={appointment?.allergies}
      />
    </div>
  )
}
