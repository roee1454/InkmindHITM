import { useEffect, useLayoutEffect, useRef, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Paperclip, SendHorizontal, X, Bot, BotOff, Image, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { listMessages, sendMessage, markConversationAsSeen, resumeBotForConversation, takeOverConversation, setMessageMediaCategory } from '../server/messages'
import { MessageBubble } from './MessageBubble'
import { BookingActionCard } from './BookingActionCard'
import type { UIConversation } from '../types'
import { useConversationsUiStore } from '../store/conversationsUiStore'
import { ImageGalleryDialog } from '@/features/calendar/components/ImageGalleryDialog'
import { messageMediaUrl } from '../lib/media'

/** Hebrew labels for staff_call_reason — until now the reason was stored but shown
 *  nowhere, leaving staff to reverse-engineer WHY the bot stopped from the transcript
 *  (HITL-5). Includes the system_* reasons the classified error handler emits. */
const REASON_LABELS: Record<string, string> = {
  price_offering: 'הצעת מחיר',
  receipt_verification: 'אימות תשלום',
  slot_conflict: 'התנגשות תורים',
  artist_assignment: 'שיוך אמן',
  reschedule_request: 'בקשת שינוי מועד',
  cancel_request: 'בקשת ביטול',
  complaint: 'תלונה',
  unhandled_query: 'שאלה ללא מענה',
  consultation_alert: 'נדרש ייעוץ',
  security_alert: 'התראת אבטחה',
  system_whatsapp_error: 'תקלת וואטסאפ',
  system_database_error: 'תקלת מערכת',
  system_model_error: 'תקלת מודל AI',
}

export function ConversationThread({ conversation }: { conversation: UIConversation }) {
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

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shouldStickToBottom = useRef(true)

  // Reset the window when switching conversations.
  useEffect(() => {
    resetThread()
    shouldStickToBottom.current = true
  }, [conversation.id, resetThread])

  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversation.id, messagesLimit],
    queryFn: () => listMessages({ data: { conversationId: conversation.id, limit: messagesLimit } }),
    // Realtime (dashboard route's PocketBase subscription) is the primary update path;
    // this long interval is only a safety net for a dropped SSE connection or a stale
    // client token (HITL-8 — was 4s, hammering the server in parallel with realtime).
    refetchInterval: 30000,
  })

  const messages = data?.messages ?? []

  const { inspirationImages, verificationImages } = useMemo(() => {
    const insp: string[] = []
    const verif: string[] = []
    messages.forEach((m) => {
      if (m.mediaFilename && m.type === 'image') {
        const url = messageMediaUrl(m.id, m.mediaFilename)
        if (m.mediaCategory === 'verification') {
          verif.push(url)
        } else {
          insp.push(url)
        }
      }
    })
    return { inspirationImages: insp, verificationImages: verif }
  }, [messages])

  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0)

  const handleImageClick = (url: string, category: 'inspiration' | 'verification' | null) => {
    const list = category === 'verification' ? verificationImages : inspirationImages
    const idx = list.indexOf(url)
    setGalleryImages(list)
    setGalleryInitialIndex(idx >= 0 ? idx : 0)
    setGalleryOpen(true)
  }

  const toggleCategoryMutation = useMutation({
    mutationFn: (params: { messageId: string; category: 'inspiration' | 'verification' | null }) =>
      setMessageMediaCategory({ data: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
    },
  })

  const markSeenMutation = useMutation({
    mutationFn: () => markConversationAsSeen({ data: { conversationId: conversation.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unseen-messages-count'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  useEffect(() => {
    const hasUnseen = messages.some((m) => m.direction === 'inbound' && !m.seen)
    // isPending guard (HITL-9): this effect fires on every realtime cache update, and
    // without it a burst of incoming messages stacked concurrent mark-seen calls.
    if (hasUnseen && !markSeenMutation.isPending) {
      markSeenMutation.mutate()
    }
  }, [messages, conversation.id])

  // Keep the view pinned to the newest message unless the user scrolled up to read history.
  useLayoutEffect(() => {
    if (shouldStickToBottom.current) bottomRef.current?.scrollIntoView()
  }, [messages])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    shouldStickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const sendMutation = useMutation({
    mutationFn: (params: {
      body: string
      replyToWamid?: string | null
      mediaData?: { base64: string; filename: string; mimeType: string } | null
    }) =>
      sendMessage({
        data: {
          conversationId: conversation.id,
          body: params.body,
          replyToWamid: params.replyToWamid,
          mediaData: params.mediaData,
        },
      }),
    onSuccess: (sentMsg) => {
      setDraft('')
      setReplyingTo(null)
      setSelectedFile(null)
      shouldStickToBottom.current = true

      // Optimistically append the sent message to the local cache
      queryClient.setQueryData(['messages', conversation.id, messagesLimit], (old: any) => {
        if (!old) return old
        if (old.messages.some((m: any) => m.id === sentMsg.id)) return old
        return {
          ...old,
          messages: [...old.messages, sentMsg],
        }
      })

      // Update conversations list status locally
      queryClient.setQueryData(['conversations'], (oldConvs: any) => {
        if (!oldConvs) return oldConvs
        return oldConvs.map((conv: any) => {
          if (conv.id === conversation.id) {
            return {
              ...conv,
              lastMessageAt: sentMsg.timestamp,
            }
          }
          return conv
        })
      })

      queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const resumeBotMutation = useMutation({
    mutationFn: () => resumeBotForConversation({ data: { conversationId: conversation.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  // Explicit takeover (HITL-6): silence the bot before it derails further, without
  // having to send a message or wait for a self-escalation.
  const takeOverMutation = useMutation({
    mutationFn: () => takeOverConversation({ data: { conversationId: conversation.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const res = reader.result as string
      const base64 = res.split(',')[1] ?? ''
      const isImg = file.type.startsWith('image/')
      setSelectedFile({
        base64,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        previewUrl: isImg ? res : undefined,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function submit() {
    const body = draft.trim()
    if ((!body && !selectedFile) || sendMutation.isPending) return
    sendMutation.mutate({
      body,
      replyToWamid: replyingTo?.id || null,
      mediaData: selectedFile
        ? {
            base64: selectedFile.base64,
            filename: selectedFile.filename,
            mimeType: selectedFile.mimeType,
          }
        : null,
    })
  }

  const title = conversation.customerName || conversation.customerPhone || 'לא ידוע'

  return (
    <div className="flex h-full flex-1 flex-col bg-background" dir="rtl">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-5 py-3">
        <div className="flex flex-col">
          <span className="font-assistant text-sm font-bold text-foreground">{title}</span>
          <span className="font-assistant text-xs text-muted-foreground dir-ltr text-right">
            {conversation.customerPhone}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {conversation.status === 'escalated' && conversation.staffCallReason ? (
              <Badge
                variant="outline"
                className={
                  conversation.staffCallReason === 'security_alert' || conversation.staffCallReason.startsWith('system_')
                    ? 'rounded-lg border-destructive/30 bg-destructive/10 font-assistant text-destructive'
                    : 'rounded-lg border-amber-500/30 bg-amber-500/10 font-assistant text-amber-700 dark:text-amber-400'
                }
              >
                הבוט עצר: {REASON_LABELS[conversation.staffCallReason] ?? conversation.staffCallReason}
              </Badge>
            ) : null}
            {conversation.status === 'bot_active' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl cursor-pointer gap-1.5"
                disabled={takeOverMutation.isPending}
                onClick={() => takeOverMutation.mutate()}
                title="עצירת הבוט ומעבר לטיפול ידני, בלי לשלוח הודעה"
              >
                <BotOff className="size-4" />
                {takeOverMutation.isPending ? 'עוצר בוט…' : 'קח שליטה'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl cursor-pointer gap-1.5"
                disabled={resumeBotMutation.isPending}
                onClick={() => resumeBotMutation.mutate()}
              >
                <Bot className="size-4" />
                {resumeBotMutation.isPending ? 'מחזיר לבוט…' : 'החזרה לבוט'}
              </Button>
            )}
            {inspirationImages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setGalleryImages(inspirationImages)
                  setGalleryInitialIndex(0)
                  setGalleryOpen(true)
                }}
                className="rounded-xl cursor-pointer gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
              >
                <Image className="size-4" />
                תמונות השראה ({inspirationImages.length})
              </Button>
            )}
            {verificationImages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setGalleryImages(verificationImages)
                  setGalleryInitialIndex(0)
                  setGalleryOpen(true)
                }}
                className="rounded-xl cursor-pointer gap-1.5 border-border text-foreground hover:bg-muted"
              >
                <FileCheck className="size-4" />
                אסמכתות ({verificationImages.length})
              </Button>
            )}
          </div>
        </div>
      </header>

      <BookingActionCard conversation={conversation} />

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-2 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground">טוען הודעות…</p>
        ) : (
          <>
            {data?.hasMore ? (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    shouldStickToBottom.current = false
                    setMessagesLimit(messagesLimit + 50)
                  }}
                >
                  טעינת הודעות ישנות יותר
                </Button>
              </div>
            ) : null}
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">אין הודעות עדיין.</p>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onReply={(msg) => setReplyingTo(msg)}
                  onImageClick={handleImageClick}
                  onCategoryToggle={(msgId, currCat) => {
                    const nextCat = currCat === 'verification' ? 'inspiration' : 'verification'
                    toggleCategoryMutation.mutate({ messageId: msgId, category: nextCat })
                  }}
                />
              ))
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="border-t border-border bg-card p-3 space-y-2">
        {/* Reply Context Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-muted/60 border-r-4 border-primary px-3 py-1.5 rounded-lg text-xs">
            <div className="flex flex-col truncate">
              <span className="font-bold text-primary text-[11px]">השבה להודעה:</span>
              <span className="truncate text-muted-foreground text-[11px]">{replyingTo.body || 'מדיה'}</span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:text-foreground text-muted-foreground cursor-pointer shrink-0"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Selected File Attachment Banner */}
        {selectedFile && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-2 rounded-xl text-xs">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.previewUrl ? (
                <img src={selectedFile.previewUrl} alt="" className="size-8 rounded object-cover shrink-0" />
              ) : (
                <Paperclip className="size-4 text-primary shrink-0" />
              )}
              <span className="truncate font-semibold text-foreground">{selectedFile.filename}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-1 text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {sendMutation.isError ? (
          <p className="text-xs text-destructive font-semibold">
            {sendMutation.error instanceof Error ? sendMutation.error.message : 'שליחת ההודעה נכשלה.'}
          </p>
        ) : null}

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl shrink-0 cursor-pointer"
            title="צרף תמונה או קובץ"
          >
            <Paperclip className="size-4" />
          </Button>

          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="כתיבת הודעה…"
            className="max-h-32 min-h-10 flex-1 resize-none font-assistant text-sm"
            rows={1}
          />

          <Button
            type="button"
            onClick={submit}
            disabled={(!draft.trim() && !selectedFile) || sendMutation.isPending}
            className="shrink-0 rounded-xl cursor-pointer"
          >
            <SendHorizontal className="size-4" />
            {sendMutation.isPending ? 'שולח…' : 'שליחה'}
          </Button>
        </div>
      </div>
      <ImageGalleryDialog
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </div>
  )
}
