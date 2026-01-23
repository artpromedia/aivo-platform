/**
 * Messaging Hooks
 * Sprint 1.8: Integrate Web Parent Messaging with messaging-svc
 *
 * React Query hooks for messaging functionality with optimistic updates,
 * caching, and real-time WebSocket integration.
 */

'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { isDevMode } from '@/lib/api/client';
import {
  messagingApi,
  type Conversation,
  type Message,
  type MessagePage,
  type ConversationsPage,
  type GetConversationsOptions,
  type GetMessagesOptions,
  type SendMessagePayload,
  type CreateConversationPayload,
  type ChildWithTeachers,
  type UnreadCounts,
} from '@/lib/api/messaging.api';
import {
  useMessagingSocket,
  messagingQueryKeys,
  type ConnectionState,
  type TypingIndicator,
} from '@/lib/websocket/messaging-socket';

// ============================================================================
// Query Keys
// ============================================================================

export { messagingQueryKeys };

// ============================================================================
// Configuration
// ============================================================================

const STALE_TIMES = {
  conversations: 1 * 60 * 1000, // 1 minute
  messages: 30 * 1000, // 30 seconds
  unreadCounts: 30 * 1000, // 30 seconds
  children: 5 * 60 * 1000, // 5 minutes
};

const REFETCH_INTERVALS = {
  conversations: 30 * 1000, // 30 seconds (fallback when WS disconnected)
  messages: 10 * 1000, // 10 seconds (fallback when WS disconnected)
};

// ============================================================================
// Conversations Hooks
// ============================================================================

/**
 * Hook to fetch conversations list
 */
export function useConversations(options?: GetConversationsOptions) {
  return useQuery({
    queryKey: messagingQueryKeys.conversations(options),
    queryFn: () => messagingApi.getConversations(options),
    staleTime: STALE_TIMES.conversations,
    refetchInterval: REFETCH_INTERVALS.conversations,
    retry: isDevMode() ? 0 : 3,
  });
}

/**
 * Hook to fetch a single conversation
 */
export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: messagingQueryKeys.conversation(conversationId ?? ''),
    queryFn: () => {
      if (!conversationId) throw new Error('conversationId is required');
      return messagingApi.getConversation(conversationId);
    },
    enabled: !!conversationId,
    staleTime: STALE_TIMES.conversations,
    retry: isDevMode() ? 0 : 3,
  });
}

/**
 * Hook to create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConversationPayload) => messagingApi.createConversation(payload),
    onSuccess: (newConversation) => {
      // Invalidate conversations list
      void queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversations(),
      });

      // Optionally set the new conversation in cache
      queryClient.setQueryData(
        messagingQueryKeys.conversation(newConversation.id),
        newConversation
      );
    },
  });
}

/**
 * Hook to archive a conversation
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => messagingApi.archiveConversation(conversationId),
    onMutate: async (conversationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: messagingQueryKeys.conversations(),
      });

      // Optimistic update
      queryClient.setQueryData<ConversationsPage>(messagingQueryKeys.conversations(), (old) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.map((c) =>
            c.id === conversationId ? { ...c, archived: true } : c
          ),
        };
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversations(),
      });
    },
  });
}

/**
 * Hook to unarchive a conversation
 */
export function useUnarchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => messagingApi.unarchiveConversation(conversationId),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversations(),
      });
    },
  });
}

/**
 * Hook to mute/unmute a conversation
 */
export function useMuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, muted }: { conversationId: string; muted: boolean }) =>
      messagingApi.setMuted(conversationId, muted),
    onMutate: async ({ conversationId, muted }) => {
      await queryClient.cancelQueries({
        queryKey: messagingQueryKeys.conversations(),
      });

      queryClient.setQueryData<ConversationsPage>(messagingQueryKeys.conversations(), (old) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.map((c) =>
            c.id === conversationId ? { ...c, muted } : c
          ),
        };
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversations(),
      });
    },
  });
}

// ============================================================================
// Messages Hooks
// ============================================================================

/**
 * Hook to fetch messages for a conversation
 */
export function useMessages(conversationId: string | null, options?: GetMessagesOptions) {
  return useQuery({
    queryKey: messagingQueryKeys.messages(conversationId ?? ''),
    queryFn: () => {
      if (!conversationId) throw new Error('conversationId is required');
      return messagingApi.getMessages(conversationId, options);
    },
    enabled: !!conversationId,
    staleTime: STALE_TIMES.messages,
    refetchInterval: REFETCH_INTERVALS.messages,
    retry: isDevMode() ? 0 : 3,
  });
}

/**
 * Hook to fetch messages with infinite scrolling
 */
export function useInfiniteMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: [...messagingQueryKeys.messages(conversationId ?? ''), 'infinite'] as const,
    queryFn: ({ pageParam }) => {
      if (!conversationId) throw new Error('conversationId is required');
      return messagingApi.getMessages(conversationId, { cursor: pageParam });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
    staleTime: STALE_TIMES.messages,
    retry: isDevMode() ? 0 : 3,
  });
}

/**
 * Hook to send a message with optimistic updates
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      payload,
    }: {
      conversationId: string;
      payload: SendMessagePayload;
    }) => messagingApi.sendMessage(conversationId, payload),

    onMutate: async ({ conversationId, payload }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: messagingQueryKeys.messages(conversationId),
      });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<MessagePage>(
        messagingQueryKeys.messages(conversationId)
      );

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: 'current-user',
        senderType: 'parent',
        senderName: 'You',
        content: payload.content,
        sentAt: new Date().toISOString(),
      };

      // Optimistically update messages
      queryClient.setQueryData<MessagePage>(messagingQueryKeys.messages(conversationId), (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, optimisticMessage],
        };
      });

      // Return context for rollback
      return { previousMessages, optimisticMessage };
    },

    onError: (_error, { conversationId }, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messagingQueryKeys.messages(conversationId),
          context.previousMessages
        );
      }
    },

    onSuccess: (newMessage, { conversationId }, context) => {
      // Replace optimistic message with real one
      queryClient.setQueryData<MessagePage>(messagingQueryKeys.messages(conversationId), (old) => {
        if (!old) return old;
        const optimisticId = context?.optimisticMessage?.id;
        return {
          ...old,
          messages: old.messages.map((msg) => (msg.id === optimisticId ? newMessage : msg)),
        };
      });

      // Update conversations list to reflect new last message
      void queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.conversations(),
      });
    },
  });
}

/**
 * Hook to mark a conversation as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId?: string }) =>
      messagingApi.markAsRead(conversationId, messageId),

    onMutate: async ({ conversationId }) => {
      // Optimistically update unread count
      queryClient.setQueryData<ConversationsPage>(messagingQueryKeys.conversations(), (old) => {
        if (!old) return old;
        const updatedUnread = old.conversations.reduce((sum, c) => {
          if (c.id === conversationId) return sum;
          return sum + c.unreadCount;
        }, 0);
        return {
          ...old,
          conversations: old.conversations.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          ),
          totalUnread: updatedUnread,
        };
      });
    },

    onSettled: () => {
      // Refresh unread counts
      void queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.unreadCounts(),
      });
    },
  });
}

/**
 * Hook to delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      messagingApi.deleteMessage(conversationId, messageId),

    onMutate: async ({ conversationId, messageId }) => {
      await queryClient.cancelQueries({
        queryKey: messagingQueryKeys.messages(conversationId),
      });

      const previousMessages = queryClient.getQueryData<MessagePage>(
        messagingQueryKeys.messages(conversationId)
      );

      queryClient.setQueryData<MessagePage>(messagingQueryKeys.messages(conversationId), (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.filter((msg) => msg.id !== messageId),
        };
      });

      return { previousMessages };
    },

    onError: (_error, { conversationId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messagingQueryKeys.messages(conversationId),
          context.previousMessages
        );
      }
    },
  });
}

/**
 * Hook to edit a message
 */
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      content,
    }: {
      conversationId: string;
      messageId: string;
      content: string;
    }) => messagingApi.editMessage(conversationId, messageId, content),

    onSuccess: (updatedMessage, { conversationId }) => {
      queryClient.setQueryData<MessagePage>(messagingQueryKeys.messages(conversationId), (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((msg) =>
            msg.id === updatedMessage.id ? updatedMessage : msg
          ),
        };
      });
    },
  });
}

// ============================================================================
// Unread Counts Hook
// ============================================================================

/**
 * Hook to get unread message counts
 */
export function useUnreadCounts() {
  return useQuery({
    queryKey: messagingQueryKeys.unreadCounts(),
    queryFn: () => messagingApi.getUnreadCounts(),
    staleTime: STALE_TIMES.unreadCounts,
    refetchInterval: REFETCH_INTERVALS.conversations,
    retry: isDevMode() ? 0 : 3,
  });
}

// ============================================================================
// Children & Teachers Hook
// ============================================================================

/**
 * Hook to get children with their teachers for compose modal
 */
export function useChildrenWithTeachers() {
  return useQuery({
    queryKey: ['messaging', 'children-with-teachers'] as const,
    queryFn: () => messagingApi.getChildrenWithTeachers(),
    staleTime: STALE_TIMES.children,
    retry: isDevMode() ? 0 : 3,
  });
}

// ============================================================================
// Search Hook
// ============================================================================

/**
 * Hook to search messages
 */
export function useSearchMessages(query: string, enabled = true) {
  return useQuery({
    queryKey: ['messaging', 'search', query] as const,
    queryFn: () => messagingApi.searchMessages(query),
    enabled: enabled && query.length >= 2,
    staleTime: 60 * 1000, // 1 minute
    retry: isDevMode() ? 0 : 3,
  });
}

// ============================================================================
// Combined Messaging Hook
// ============================================================================

/**
 * Combined hook for full messaging functionality with WebSocket
 *
 * Provides:
 * - Conversations list
 * - Selected conversation messages
 * - Send message with optimistic updates
 * - Mark as read
 * - Real-time updates via WebSocket
 * - Typing indicators
 */
export function useMessaging(options?: {
  userId?: string | null;
  authToken?: string | null;
  includeArchived?: boolean;
  selectedConversationId?: string | null;
  onNewMessage?: (message: Message, conversation: Conversation) => void;
}) {
  const queryClient = useQueryClient();

  // Conversations
  const conversations = useConversations({
    includeArchived: options?.includeArchived,
  });

  // Messages for selected conversation
  const messages = useMessages(options?.selectedConversationId || null);

  // Mutations
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const createConversation = useCreateConversation();
  const archiveConversation = useArchiveConversation();

  // WebSocket connection
  const socket = useMessagingSocket(options?.userId ?? null, options?.authToken ?? null, {
    onMessage: options?.onNewMessage,
    enabled: Boolean(options?.userId) && Boolean(options?.authToken),
  });

  // Subscribe to selected conversation
  const { subscribeToConversation, unsubscribeFromConversation } = socket;

  // Handle conversation selection
  const selectConversation = useCallback(
    (conversationId: string | null) => {
      // Unsubscribe from previous
      if (options?.selectedConversationId) {
        unsubscribeFromConversation(options.selectedConversationId);
      }

      // Subscribe to new
      if (conversationId) {
        subscribeToConversation(conversationId);
        markAsRead.mutate({ conversationId });
      }
    },
    [
      options?.selectedConversationId,
      subscribeToConversation,
      unsubscribeFromConversation,
      markAsRead,
    ]
  );

  // Send message helper
  const send = useCallback(
    (content: string, replyTo?: string) => {
      if (!options?.selectedConversationId) return;

      sendMessage.mutate({
        conversationId: options.selectedConversationId,
        payload: { content, replyTo },
      });
    },
    [options?.selectedConversationId, sendMessage]
  );

  // Computed values
  const totalUnread = useMemo(
    () => conversations.data?.totalUnread || 0,
    [conversations.data?.totalUnread]
  );

  const selectedConversation = useMemo(
    () =>
      conversations.data?.conversations.find((c) => c.id === options?.selectedConversationId) ||
      messages.data?.conversation,
    [
      conversations.data?.conversations,
      options?.selectedConversationId,
      messages.data?.conversation,
    ]
  );

  // Refresh all data
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: messagingQueryKeys.conversations(),
    });
    if (options?.selectedConversationId) {
      void queryClient.invalidateQueries({
        queryKey: messagingQueryKeys.messages(options.selectedConversationId),
      });
    }
  }, [queryClient, options?.selectedConversationId]);

  return {
    // Connection state
    connectionState: socket.connectionState,
    isConnected: socket.isConnected,

    // Conversations
    conversations: conversations.data?.conversations || [],
    conversationsLoading: conversations.isLoading,
    conversationsError: conversations.error,
    totalUnread,

    // Selected conversation
    selectedConversation,
    messages: messages.data?.messages || [],
    messagesLoading: messages.isLoading,
    messagesError: messages.error,

    // Typing indicators
    typingIndicators: socket.typingIndicators,
    getTypingIndicator: socket.getTypingIndicator,
    sendTypingIndicator: socket.sendTypingIndicator,

    // Actions
    selectConversation,
    send,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    markAsRead: markAsRead.mutate,
    createConversation: createConversation.mutateAsync,
    isCreating: createConversation.isPending,
    archiveConversation: archiveConversation.mutate,
    refresh,
  };
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  Conversation,
  Message,
  MessagePage,
  ConversationsPage,
  GetConversationsOptions,
  GetMessagesOptions,
  SendMessagePayload,
  CreateConversationPayload,
  ChildWithTeachers,
  UnreadCounts,
  ConnectionState,
  TypingIndicator,
};
