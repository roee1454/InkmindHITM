import { forwardRef } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useMcpConversationsList, useMcpPendingActionsCount } from '../hooks/useMcpConversation'

/** The floating trigger — meant to be passed as `McpPanel`'s `anchor` prop, which wraps it in a
 *  Radix `SheetTrigger`/`PopoverTrigger asChild`. Forwards ref + spreads props so that Slot
 *  merge works. Fixed position: mobile clears `MobileBottomNav` (96px, above its safe-area
 *  padding), desktop sits in the free corner (no bottom nav there). */
export const McpBubble = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function McpBubble(props, ref) {
    const { data: pendingCount } = useMcpPendingActionsCount()
    const { data: conversations } = useMcpConversationsList()

    const hasPending = Boolean(pendingCount && pendingCount > 0)
    // A conversation has an unread answer once its `lastMessageAt` (bumped only after a full
    // turn — owner message + assistant reply — completes, see `runMcpTurn`) moves past
    // `lastReadAt` (persisted server-side on the conversation record, see `markConversationRead`
    // — so this survives a page reload, unlike client-only UI state).
    const hasUnreadAnswer = Boolean(
      conversations?.some((c) => {
        if (!c.lastMessageAt) return false
        return !c.lastReadAt || new Date(c.lastMessageAt) > new Date(c.lastReadAt)
      }),
    )

    // Reads the app-wide `QueryClient`'s mutation cache directly — true even if the panel
    // (and the component that started the mutation) has been closed/unmounted, so an in-flight
    // request is never silently lost from the staff member's point of view.
    const isSending = useIsMutating({ mutationKey: ['mcp-send-message'] }) > 0
    const isApproving = useIsMutating({ mutationKey: ['mcp-approve-action'] }) > 0
    const isBusy = isSending || isApproving

    return (
      <button
        ref={ref}
        type="button"
        aria-label="עוזר MCP"
        aria-busy={isBusy}
        className="fixed end-[18px] bottom-[calc(var(--app-bottom-nav-h)+32px)] z-50 flex size-[58px] cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_30px_-10px_rgba(0,0,0,0.4)] transition-transform active:scale-95 lg:end-6 lg:bottom-6"
        {...props}
      >
        {isBusy && (
          <span className="absolute inset-[-4px] animate-spin rounded-full border-2 border-primary-foreground/25 border-t-primary-foreground motion-reduce:animate-none motion-reduce:border-t-primary-foreground/70" />
        )}
        <Sparkles size={25} className={isBusy ? 'animate-pulse motion-reduce:animate-none' : ''} />
        {/* Orange takes priority — a pending action still needs confirming even if it also
         *  counts as "an answer you haven't read yet". Green (unread, nothing to confirm) only
         *  shows when there's no pending action. No dot at all once everything's read/resolved. */}
        {(hasPending || hasUnreadAnswer) && (
          <span
            className={`absolute -top-0.5 -start-0.5 block size-[15px] rounded-full border-[2.5px] border-background ${
              hasPending ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        )}
        {hasPending && (
          <span className="absolute -top-1.5 -end-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold text-white">
            {pendingCount}
          </span>
        )}
      </button>
    )
  },
)
