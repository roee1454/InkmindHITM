import { useEffect, useLayoutEffect, useRef, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Paperclip, SendHorizontal, X, Bot, BotOff, EllipsisVertical, ChevronRight, Clock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { listMessages, sendMessage, markConversationAsSeen, resumeBotForConversation, takeOverConversation, setMessageMediaCategory } from '../server/messages'
import { MessageBubble } from './MessageBubble'
import { BookingActionCard } from './BookingActionCard'
import type { UIConversation } from '../types'
import { useConversationsUiStore } from '../store/conversationsUiStore'
import { ImageGalleryDialog } from '@/features/calendar/components/ImageGalleryDialog'
import { InspirationGalleryDialog, type ReceiptEntry } from './InspirationGalleryDialog'
import { messageMediaUrl } from '../lib/media'
import { formatWindowRemaining } from '../lib/format'

const WINDOW_BADGE_STYLES: Record<string, string> = {
  open: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'closing-soon': 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  expired: 'border-destructive/30 bg-destructive/10 text-destructive',
}

/** `wa.me` needs digits only (no `+`, spaces, or dashes). */
function waMeLink(phone: string, draft: string): string {
  const digits = phone.replace(/\D/g, '')
  const text = draft.trim()
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

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

export function ConversationThread({
  conversation,
  onBack,
}: {
  conversation: UIConversation
  /** Mobile only — returns to the conversation list. Undefined on desktop (both panes visible). */
  onBack?: () => void
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

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const shouldStickToBottom = useRef(true)

  // Reset the window when switching conversations.
  useEffect(() => {
    resetThread()
    shouldStickToBottom.current = true
  }, [conversation.id, resetThread])

  // The 24h countdown badge and the disabled-composer state below both depend on "now", which
  // `windowExpiresAt` alone doesn't re-derive on its own — this forces a re-render every minute
  // so both stay live without needing a data refetch.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const interval = window.setInterval(() => forceTick((n) => n + 1), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const windowInfo = formatWindowRemaining(conversation.windowExpiresAt)
  const windowExpired = windowInfo.status === 'expired'

  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversation.id, messagesLimit],
    queryFn: () => listMessages({ data: { conversationId: conversation.id, limit: messagesLimit } }),
    // Realtime (dashboard route's PocketBase subscription) is the primary update path;
    // this long interval is only a safety net for a dropped SSE connection or a stale
    // client token (HITL-8 — was 4s, hammering the server in parallel with realtime).
    refetchInterval: 30000,
  })

  const messages = data?.messages ?? []

  const { inspirationImages, verificationImages, receipts } = useMemo(() => {
    const insp: string[] = []
    const verif: string[] = []
    const receiptEntries: ReceiptEntry[] = []
    messages.forEach((m) => {
      if (m.mediaFilename && m.type === 'image') {
        const url = messageMediaUrl(m.id, m.mediaFilename)
        if (m.mediaCategory === 'verification') {
          verif.push(url)
          receiptEntries.push({ url, timestamp: m.timestamp })
        } else {
          insp.push(url)
        }
      }
    })
    return { inspirationImages: insp, verificationImages: verif, receipts: receiptEntries }
  }, [messages])

  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0)
  const [inspirationDialogOpen, setInspirationDialogOpen] = useState(false)

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
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 lg:px-5">
        <div className="flex min-w-0 items-center gap-1.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="חזרה לרשימת השיחות"
              // RTL: "back" points right, matching CalendarGrid's prev control.
              className="-ms-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent active:bg-accent lg:hidden cursor-pointer"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-assistant text-sm font-bold text-foreground leading-tight">{title}</span>
            <span className="font-assistant text-xs text-muted-foreground dir-ltr text-right leading-tight">
              {conversation.customerPhone}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={`h-7 px-2 text-[11px] font-semibold gap-1 shrink-0 rounded-lg ${WINDOW_BADGE_STYLES[windowInfo.status]}`}
            title={windowInfo.label}
          >
            <Clock className="size-3 shrink-0" />
            <span className="hidden md:inline">{windowInfo.label}</span>
            <span className="md:hidden">{windowInfo.shortLabel}</span>
          </Badge>

          {conversation.status === 'escalated' && conversation.staffCallReason ? (
            <Badge
              variant="outline"
              className={`h-7 px-2 text-[11px] font-semibold gap-1 shrink-0 rounded-lg max-w-[120px] sm:max-w-none truncate ${
                conversation.staffCallReason === 'security_alert' || conversation.staffCallReason.startsWith('system_')
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}
              title={`עצירת בוט: ${REASON_LABELS[conversation.staffCallReason] ?? conversation.staffCallReason}`}
            >
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="truncate">{REASON_LABELS[conversation.staffCallReason] ?? conversation.staffCallReason}</span>
            </Badge>
          ) : null}

          {conversation.status === 'bot_active' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs rounded-lg cursor-pointer gap-1 shrink-0 font-medium"
              disabled={takeOverMutation.isPending}
              onClick={() => takeOverMutation.mutate()}
              title={
                windowExpired
                  ? 'החלון סגור — הבוט לא באמת יכול להגיב כרגע. מומלץ לקחת שליטה.'
                  : 'עצירת הבוט ומעבר לטיפול ידני, בלי לשלוח הודעה'
              }
            >
              <BotOff className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="hidden sm:inline">{takeOverMutation.isPending ? 'עוצר…' : 'קח שליטה'}</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs rounded-lg cursor-pointer gap-1 shrink-0 font-medium border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
              // Outside the window the bot can't send free-text replies either — resuming it
              // would just leave the conversation silently stuck, so keep a human in control.
              disabled={resumeBotMutation.isPending || windowExpired}
              onClick={() => resumeBotMutation.mutate()}
              title={windowExpired ? 'לא ניתן להפעיל את הבוט מחוץ לחלון 24 השעות' : 'הפעלת הבוט מחדש'}
            >
              <Bot className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">{resumeBotMutation.isPending ? 'מפעיל…' : 'הפעל בוט'}</span>
            </Button>
          )}

          {(inspirationImages.length > 0 || verificationImages.length > 0) && (
            <button
              type="button"
              onClick={() => setInspirationDialogOpen(true)}
              aria-label="גלריית שיחה"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground shrink-0 cursor-pointer"
              title="גלריית מדיה"
            >
              <EllipsisVertical className="size-4" />
            </button>
          )}
        </div>
      </header>

      <BookingActionCard
        conversation={conversation}
        receiptImageUrl={verificationImages[verificationImages.length - 1]}
        onZoomReceipt={(url) => {
          setGalleryImages([url])
          setGalleryInitialIndex(0)
          setGalleryOpen(true)
        }}
      />

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

      {/* The bottom tab bar is hidden in thread view, so nothing else keeps the composer clear
          of the iOS home indicator. */}
      <div
        className="space-y-2 border-t border-border bg-card p-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Reply Context Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-muted/60 border-r-4 border-primary px-3 py-1.5 rounded-lg text-xs">
            <div className="flex flex-col truncate">
              <span className="font-bold text-primary text-mini">השבה להודעה:</span>
              <span className="truncate text-muted-foreground text-mini">{replyingTo.body || 'מדיה'}</span>
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

        {windowExpired ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5">
            <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-destructive">
              חלון 24 השעות פג — אי אפשר לשלוח הודעה חופשית עד שהלקוח/ה יכתוב/תכתוב.
              <span className="block font-normal text-muted-foreground">בקרוב: שליחת תבנית מאושרת מכאן.</span>
            </p>
            <a
              href={waMeLink(conversation.customerPhone, draft)}
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground"
            >
              <ExternalLink className="size-3.5" />
              וואטסאפ
            </a>
          </div>
        ) : (
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
        )}
      </div>
      <ImageGalleryDialog
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
      <InspirationGalleryDialog
        open={inspirationDialogOpen}
        onOpenChange={setInspirationDialogOpen}
        inspirationImages={inspirationImages}
        receipts={receipts}
      />
    </div>
  )
}
