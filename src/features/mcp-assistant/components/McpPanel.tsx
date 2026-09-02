import { useEffect, useRef } from 'react'
import { ArrowUp, ChevronDown, ChevronUp, MessageSquarePlus, Sparkles, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsMobile } from '@/hooks/use-media-query'
import { useMcpConversation } from '../hooks/useMcpConversation'
import { useMcpUiStore } from '../store/mcpUiStore'
import { McpMessageBubble } from './McpMessageBubble'
import { McpAssistantTurn } from './McpAssistantTurn'
import { McpToolCallCard } from './McpToolCallCard'
import { McpActionCard } from './McpActionCard'
import { McpHistoryList } from './McpHistoryList'

interface McpPanelProps {
  anchor: React.ReactNode
}

export function McpPanel({ anchor }: McpPanelProps) {
  const isMobile = useIsMobile()
  const isOpen = useMcpUiStore((s) => s.isOpen)
  const close = useMcpUiStore((s) => s.close)
  const open = useMcpUiStore((s) => s.open)

  const body = <McpPanelBody />

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(v) => (v ? open() : close())}>
        <SheetTrigger asChild>{anchor}</SheetTrigger>
        <SheetContent side="bottom" showCloseButton={false} className="flex h-[88svh] flex-col gap-0 p-0">
          {body}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={(v) => (v ? open() : close())}>
      <PopoverTrigger asChild>{anchor}</PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={12} className="flex h-[560px] w-[420px] flex-col gap-0 p-0">
        {body}
      </PopoverContent>
    </Popover>
  )
}

function McpPanelBody() {
  const panelMode = useMcpUiStore((s) => s.panelMode)
  const toggleHistory = useMcpUiStore((s) => s.toggleHistory)
  const activeConversationId = useMcpUiStore((s) => s.activeConversationId)
  const setActiveConversation = useMcpUiStore((s) => s.setActiveConversation)
  const close = useMcpUiStore((s) => s.close)
  const draft = useMcpUiStore((s) => s.draft)
  const setDraft = useMcpUiStore((s) => s.setDraft)
  const clearDraftEdit = useMcpUiStore((s) => s.clearDraftEdit)

  const {
    data,
    isLoading,
    createConversation,
    sendMessage,
    approve,
    cancel,
    undo,
    edit,
    markRead,
  } = useMcpConversation(activeConversationId)

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [data?.messages.length])

  // This effect only runs while the panel is mounted (i.e. open — Radix unmounts Sheet/Popover
  // content on close) and a conversation is actively being viewed in chat mode, so it both
  // clears unread state on open and keeps it cleared live if a reply lands while already open.
  // Persisted server-side (`markRead`, see the hook) so it survives a page reload; guarded so it
  // only fires once per new message rather than on every render.
  const lastMessageAt = data?.conversation.lastMessageAt
  const lastReadAt = data?.conversation.lastReadAt
  useEffect(() => {
    if (panelMode !== 'chat' || !activeConversationId || !lastMessageAt) return
    if (lastReadAt && new Date(lastReadAt) >= new Date(lastMessageAt)) return
    markRead.mutate(activeConversationId)
  }, [panelMode, activeConversationId, lastMessageAt, lastReadAt])

  const conversationTitle = data?.conversation.title || (activeConversationId ? '…' : 'שיחה חדשה')
  const anyEditing = (data?.actions || []).some((a) => a.status === 'editing')
  const composerLocked = anyEditing || sendMessage.isPending

  const handleCreate = () => {
    createConversation.mutate()
  }

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    if (!activeConversationId) {
      createConversation.mutate(undefined, {
        onSuccess: (conversation) => {
          setActiveConversation(conversation.id)
          sendMessage.mutate({ conversationId: conversation.id, text })
        },
      })
      return
    }
    sendMessage.mutate({ conversationId: activeConversationId, text })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card font-assistant" dir="rtl">
      <div className="flex shrink-0 items-center gap-2 border-b border-border p-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles size={17} />
        </span>
        <button
          type="button"
          onClick={toggleHistory}
          className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-xl bg-muted px-2.5"
        >
          <span className="truncate text-[15px] font-extrabold text-foreground">
            {panelMode === 'history' ? 'היסטוריית שיחות' : conversationTitle}
          </span>
          {panelMode === 'history' ? (
            <ChevronUp size={15} className="shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={handleCreate}
          aria-label="שיחה חדשה"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground"
        >
          <MessageSquarePlus size={17} />
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="סגירה"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground"
        >
          <X size={17} />
        </button>
      </div>

      {panelMode === 'history' ? (
        <McpHistoryList
          onSelect={(id) => {
            setActiveConversation(id)
          }}
          onCreate={handleCreate}
          creating={createConversation.isPending}
        />
      ) : (
        <>
          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
            {!activeConversationId && (
              <p className="m-auto max-w-[26ch] text-center text-[13.5px] font-semibold text-muted-foreground">
                שאלו אותי כל דבר על הסטודיו — תורים, לידים, תשלומים.
              </p>
            )}
            {isLoading && activeConversationId && <p className="text-center text-[13px] text-muted-foreground">טוען…</p>}
            {data?.messages.map((message) => {
              const isAssistant = message.role === 'assistant'
              const relatedCards = isAssistant && (message.toolCalls.length > 0 || data.actions.some((a) => a.messageId === message.id))
              return (
                <div key={message.id} className="flex flex-col gap-2">
                  {isAssistant ? <McpAssistantTurn message={message} /> : <McpMessageBubble message={message} />}
                  {relatedCards && (
                    <div className="flex flex-col gap-2 ms-[38px]">
                      {message.toolCalls.length > 0 && (
                        <div className="flex flex-wrap items-start gap-1.5">
                          {message.toolCalls.map((call, i) => (
                            <McpToolCallCard key={`${message.id}-${i}`} call={call} />
                          ))}
                        </div>
                      )}
                      {data.actions
                        .filter((a) => a.messageId === message.id)
                        .map((action) => (
                          <McpActionCard
                            key={action.id}
                            action={action}
                            busy={approve.isPending || cancel.isPending || undo.isPending || edit.isPending}
                            onApprove={() => approve.mutate(action.id)}
                            onCancel={() => cancel.mutate(action.id)}
                            onUndo={() => undo.mutate(action.id)}
                            onStartEdit={() => edit.mutate({ actionId: action.id, editing: true })}
                            onDiscardEdit={() => {
                              clearDraftEdit(action.id)
                              edit.mutate({ actionId: action.id, editing: false })
                            }}
                            onSaveEdit={(args) => {
                              edit.mutate(
                                { actionId: action.id, editing: false, args },
                                { onSuccess: () => approve.mutate(action.id) },
                              )
                            }}
                          />
                        ))}
                    </div>
                  )}
                </div>
              )
            })}
            {sendMessage.isPending && (
              <div className="flex animate-in fade-in items-start gap-2.5 duration-300 motion-reduce:animate-none">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles size={13} className="animate-pulse motion-reduce:animate-none" />
                </span>
                <span className="mt-1.5 text-[13.5px] font-semibold text-muted-foreground">
                  חושב
                  <span className="inline-flex w-4 animate-pulse motion-reduce:animate-none">…</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-border p-2.5">
            <input
              value={draft}
              disabled={composerLocked}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={anyEditing ? 'סיים/י את העריכה כדי להמשיך…' : 'שאל/י כל דבר על הסטודיו…'}
              className="h-11 flex-1 rounded-2xl bg-muted px-3.5 text-[14.5px] font-medium text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <button
              type="button"
              disabled={composerLocked || !draft.trim()}
              onClick={handleSend}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <ArrowUp size={19} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
