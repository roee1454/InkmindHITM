import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveAction,
  cancelAction,
  createMcpConversation,
  deleteMcpConversation,
  editAction,
  getMcpConversation,
  getMcpPendingActionsCount,
  listMcpConversations,
  markConversationRead,
  sendMcpMessage,
  undoAction,
} from '../server/mcp-conversations'
import { useMcpUiStore } from '../store/mcpUiStore'
import type { McpAction, McpConversation, McpMessage } from '../types'

type ConversationData = { conversation: McpConversation; messages: McpMessage[]; actions: McpAction[] }

export function useMcpConversationsList() {
  return useQuery({
    queryKey: ['mcp-conversations'],
    queryFn: () => listMcpConversations(),
  })
}

/** Standalone (not nested in `useMcpConversation`) — `McpHistoryList` operates on the list, not
 *  any single open conversation, and deleting doesn't require one to be active. Clears
 *  `activeConversationId` if the deleted conversation was the open one, so the panel doesn't
 *  keep pointing at a conversation that no longer exists. */
export function useDeleteMcpConversation() {
  const queryClient = useQueryClient()
  const activeConversationId = useMcpUiStore((s) => s.activeConversationId)
  const setActiveConversation = useMcpUiStore((s) => s.setActiveConversation)

  return useMutation({
    mutationFn: (conversationId: string) => deleteMcpConversation({ data: { conversationId } }),
    onSuccess: ({ id }) => {
      queryClient.setQueryData<McpConversation[]>(['mcp-conversations'], (old) => old?.filter((c) => c.id !== id))
      queryClient.removeQueries({ queryKey: ['mcp-conversation', id] })
      if (activeConversationId === id) setActiveConversation(null)
    },
  })
}

/** Polled (not realtime) — a 20s interval is plenty for a badge that only needs to be roughly
 *  current, and avoids adding a PocketBase subscription just for a count. */
export function useMcpPendingActionsCount() {
  return useQuery({
    queryKey: ['mcp-pending-actions-count'],
    queryFn: () => getMcpPendingActionsCount(),
    refetchInterval: 20_000,
  })
}

export function useMcpConversation(conversationId: string | null) {
  const queryClient = useQueryClient()
  const setActiveConversation = useMcpUiStore((s) => s.setActiveConversation)

  const query = useQuery({
    queryKey: ['mcp-conversation', conversationId],
    queryFn: () => getMcpConversation({ data: { conversationId: conversationId! } }),
    enabled: Boolean(conversationId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mcp-conversation', conversationId] })
    queryClient.invalidateQueries({ queryKey: ['mcp-conversations'] })
  }

  const createConversation = useMutation({
    mutationFn: () => createMcpConversation(),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['mcp-conversations'] })
      // Seed the new conversation's query cache immediately (empty message list) so that when
      // `sendMessage` fires right after this (the "type into a brand-new chat" flow), its
      // `onMutate` below finds existing cache data to optimistically append the owner's first
      // message to — otherwise that first message wouldn't appear until the round trip completes.
      queryClient.setQueryData(['mcp-conversation', conversation.id], {
        conversation,
        messages: [],
        actions: [],
      } satisfies ConversationData)
      setActiveConversation(conversation.id)
    },
  })

  // Takes an explicit `conversationId` rather than closing over this hook call's own
  // `conversationId` param — the "type in a fresh chat with none selected yet" flow creates the
  // conversation and sends the first message in the same gesture, before this component has
  // re-rendered with the new id, so a closure-bound version would silently target the stale
  // (null) conversation.
  // Unscoped `mutationKey` (not per-conversation) — `McpBubble` only needs "is any MCP send
  // in flight for this staff member right now", and there's only one active panel per staff
  // member. Lets the always-mounted bubble show an in-flight indicator via `useIsMutating`
  // even after the panel (and this hook instance) has unmounted — the mutation itself lives
  // on the app-wide `QueryClient`, independent of which component started it.
  const sendMessage = useMutation({
    mutationKey: ['mcp-send-message'],
    mutationFn: (input: { conversationId: string; text: string }) => sendMcpMessage({ data: input }),
    // Optimistically append the owner's message so it's visible immediately, rather than only
    // after the assistant's reply comes back and the conversation refetches.
    onMutate: async (input) => {
      const key = ['mcp-conversation', input.conversationId]
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<ConversationData>(key)
      if (previous) {
        const optimisticMessage: McpMessage = {
          id: `optimistic-${Date.now()}`,
          conversationId: input.conversationId,
          role: 'owner',
          body: input.text,
          toolCalls: [],
          created: new Date().toISOString(),
        }
        queryClient.setQueryData<ConversationData>(key, {
          ...previous,
          messages: [...previous.messages, optimisticMessage],
        })
      }
      return { previous, conversationId: input.conversationId }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['mcp-conversation', context.conversationId], context.previous)
      }
    },
    onSuccess: invalidate,
  })

  const approve = useMutation({
    mutationKey: ['mcp-approve-action'],
    mutationFn: (actionId: string) => approveAction({ data: { actionId } }),
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: (actionId: string) => cancelAction({ data: { actionId } }),
    onSuccess: invalidate,
  })

  const undo = useMutation({
    mutationFn: (actionId: string) => undoAction({ data: { actionId } }),
    onSuccess: invalidate,
  })

  const edit = useMutation({
    mutationFn: (input: { actionId: string; editing: boolean; args?: Record<string, unknown> }) =>
      editAction({ data: input }),
    onSuccess: invalidate,
  })

  // Persisted server-side (`mcp_conversations.last_read_at`) rather than client-only UI state,
  // so the bubble's unread indicator survives a page reload. Patches both caches directly from
  // the response instead of invalidating, so the "unread" dot clears instantly without waiting
  // on a refetch round trip.
  const markRead = useMutation({
    mutationFn: (id: string) => markConversationRead({ data: { conversationId: id } }),
    onSuccess: (conversation) => {
      queryClient.setQueryData<ConversationData>(['mcp-conversation', conversation.id], (old) =>
        old ? { ...old, conversation } : old,
      )
      queryClient.setQueryData<McpConversation[]>(['mcp-conversations'], (old) =>
        old?.map((c) => (c.id === conversation.id ? conversation : c)),
      )
    },
  })

  return {
    ...query,
    createConversation,
    sendMessage,
    approve,
    cancel,
    undo,
    edit,
    markRead,
  }
}
