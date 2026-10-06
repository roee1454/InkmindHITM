import { useState } from 'react'
import { ConversationMessages } from './ConversationMessages'
import { ConversationHeader } from './ConversationHeader'
import { ConversationComposer } from './ConversationComposer'
import { ConversationDialogs } from './ConversationDialogs'
import type { ThreadDialog } from './ConversationDialogs'
import { ThreadActionPanel } from './ThreadActionPanel'
import { useConversationThread } from '../hooks/use-conversation-thread'
import { useConversationsUiStore } from '../store/conversationsUiStore'
import type { UIConversation } from '../types'

/** The composer is closed while the customer is the one who has to act; this says on what. */
const AWAITING_CUSTOMER_NOTICE: Record<string, string> = {
  AWAIT_HEALTH_NOTICE: 'ממתינים להצהרת הבריאות של הלקוח',
  AWAIT_FINAL_CONFIRMATION: 'ממתינים לאישור הסופי של הלקוח',
}

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
  const thread = useConversationThread(conversation)
  const {
    draft,
    replyingTo,
    selectedFile,
    messagesLimit,
    setDraft,
    setReplyingTo,
    setSelectedFile,
    setMessagesLimit,
  } = useConversationsUiStore()
  const [dialog, setDialog] = useState<ThreadDialog | null>(null)
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null)
  const awaitingNotice = AWAITING_CUSTOMER_NOTICE[conversation.state]

  return (
    <div
      className="flex h-full w-full flex-1 flex-col overflow-hidden bg-background font-assistant"
      dir="rtl"
    >
      <ConversationHeader
        conversation={conversation}
        appointment={thread.appointment}
        windowInfo={thread.windowInfo}
        onBack={onBack}
        onTakeOver={() => thread.takeOver.mutate()}
        isTakingOver={thread.takeOver.isPending}
        onOpenDialog={setDialog}
      />

      <ConversationMessages
        messages={thread.messages}
        isLoading={thread.isLoading}
        hasMore={thread.hasMore}
        onLoadMore={() => setMessagesLimit(messagesLimit + 50)}
        onReply={setReplyingTo}
        onImageClick={setImageViewerUrl}
        botTurnPhase={conversation.botTurnPhase || null}
      />

      {/* The thread's footer: the decision it waits on (if any) right above where the reply is written. */}
      <div className="shrink-0 border-t border-border bg-card">
        <ThreadActionPanel
          action={thread.action}
          conversationId={conversation.id}
          appointment={thread.appointment}
          receiptImageUrl={thread.media.latestReceiptUrl}
          onOpenQuote={() => setDialog('quote')}
          onOpenReceipt={() => setDialog('receipt')}
          onResumeBot={() => setDialog('resume-bot')}
        />
        <ConversationComposer
          draft={draft}
          onDraftChange={setDraft}
          onSend={() => thread.send.mutate()}
          isSending={thread.send.isPending}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          windowExpired={thread.windowExpired}
          onOpenSendTemplate={() => setDialog('template')}
          awaitingNotice={awaitingNotice}
        />
      </div>

      <ConversationDialogs
        conversation={conversation}
        appointment={thread.appointment}
        media={thread.media}
        windowExpired={thread.windowExpired}
        open={dialog}
        onOpenChange={setDialog}
        imageViewerUrl={imageViewerUrl}
        onImageViewerChange={setImageViewerUrl}
        onTakeover={() => thread.takeOver.mutate()}
        isTakingOver={thread.takeOver.isPending}
        onDeleted={onDeleted}
      />
    </div>
  )
}
