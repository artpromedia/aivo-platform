/**
 * useChat Hook
 *
 * Real-time chat functionality with:
 * - Messages and threads
 * - Typing indicators
 * - Reactions
 * - Read receipts
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ChatMessage, ChatReaction, TypingUser } from '../types';

interface UseChatOptions {
  socket: Socket | null;
  roomId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  pageSize?: number;
}

interface UseChatResult {
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<ChatMessage>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  setTyping: (isTyping: boolean) => void;
  loadMore: () => Promise<void>;
  markAsRead: (messageId: string) => void;
}

interface SendMessageOptions {
  replyTo?: string;
  threadId?: string;
  attachments?: Array<{ type: string; url: string; name: string }>;
  mentions?: string[];
}

export function useChat(options: UseChatOptions): UseChatResult {
  const {
    socket,
    roomId,
    userId,
    displayName,
    avatarUrl,
    pageSize = 50,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const oldestMessageRef = useRef<string | null>(null);

  // Send a message
  const sendMessage = useCallback(
    async (content: string, sendOptions?: SendMessageOptions): Promise<ChatMessage> => {
      if (!socket?.connected) {
        throw new Error('Socket not connected');
      }

      return new Promise((resolve, reject) => {
        const messageData = {
          roomId,
          userId,
          displayName,
          avatarUrl,
          content,
          type: 'text' as const,
          ...sendOptions,
        };

        socket.emit(
          'chat:send',
          messageData,
          (response: { success: boolean; message?: ChatMessage; error?: string }) => {
            if (response.success && response.message) {
              resolve(response.message);
            } else {
              reject(new Error(response.error || 'Failed to send message'));
            }
          }
        );
      });
    },
    [socket, roomId, userId, displayName, avatarUrl]
  );

  // Edit a message
  const editMessage = useCallback(
    async (messageId: string, content: string): Promise<void> => {
      if (!socket?.connected) {
        throw new Error('Socket not connected');
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          'chat:edit',
          { roomId, messageId, content },
          (response: { success: boolean; error?: string }) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error || 'Failed to edit message'));
            }
          }
        );
      });
    },
    [socket, roomId]
  );

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      if (!socket?.connected) {
        throw new Error('Socket not connected');
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          'chat:delete',
          { roomId, messageId },
          (response: { success: boolean; error?: string }) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error || 'Failed to delete message'));
            }
          }
        );
      });
    },
    [socket, roomId]
  );

  // Add reaction to a message
  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket?.connected) return;

      socket.emit('chat:react', { roomId, messageId, emoji, action: 'add' });
    },
    [socket, roomId]
  );

  // Remove reaction from a message
  const removeReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket?.connected) return;

      socket.emit('chat:react', { roomId, messageId, emoji, action: 'remove' });
    },
    [socket, roomId]
  );

  // Set typing indicator
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket?.connected) return;
      if (isTyping === isTypingRef.current) return;

      isTypingRef.current = isTyping;
      socket.emit('chat:typing', { roomId, userId, displayName, isTyping });

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          if (isTypingRef.current) {
            isTypingRef.current = false;
            socket.emit('chat:typing', { roomId, userId, displayName, isTyping: false });
          }
        }, 3000);
      }
    },
    [socket, roomId, userId, displayName]
  );

  // Load more messages (pagination)
  const loadMore = useCallback(async (): Promise<void> => {
    if (!socket?.connected || isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      socket.emit(
        'chat:history',
        {
          roomId,
          before: oldestMessageRef.current,
          limit: pageSize,
        },
        (response: { success: boolean; messages?: ChatMessage[]; hasMore?: boolean; error?: string }) => {
          setIsLoading(false);

          if (response.success && response.messages) {
            const newMessages = response.messages;

            if (newMessages.length > 0) {
              oldestMessageRef.current = newMessages[0].id;
            }

            setMessages((prev) => [...newMessages, ...prev]);
            setHasMore(response.hasMore ?? false);
            resolve();
          } else {
            const errorMsg = response.error || 'Failed to load messages';
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        }
      );
    });
  }, [socket, roomId, isLoading, hasMore, pageSize]);

  // Mark message as read
  const markAsRead = useCallback(
    (messageId: string) => {
      if (!socket?.connected) return;

      socket.emit('chat:read', { roomId, messageId, userId });
    },
    [socket, roomId, userId]
  );

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    // New message received
    const handleNewMessage = (message: ChatMessage) => {
      if (message.roomId !== roomId) return;

      setMessages((prev) => {
        // Check for duplicate
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    // Message edited
    const handleMessageEdited = (message: ChatMessage) => {
      if (message.roomId !== roomId) return;

      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    };

    // Message deleted
    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, deleted: true, content: '' } : m
        )
      );
    };

    // Reaction toggled
    const handleReaction = (data: {
      messageId: string;
      userId: string;
      emoji: string;
      added: boolean;
    }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.messageId) return m;

          const reactions = [...m.reactions];
          const existingReaction = reactions.find((r) => r.emoji === data.emoji);

          if (data.added) {
            if (existingReaction) {
              if (!existingReaction.userIds.includes(data.userId)) {
                existingReaction.userIds.push(data.userId);
              }
            } else {
              reactions.push({ emoji: data.emoji, userIds: [data.userId] });
            }
          } else {
            if (existingReaction) {
              existingReaction.userIds = existingReaction.userIds.filter(
                (id) => id !== data.userId
              );
              if (existingReaction.userIds.length === 0) {
                const index = reactions.indexOf(existingReaction);
                reactions.splice(index, 1);
              }
            }
          }

          return { ...m, reactions };
        })
      );
    };

    // Typing indicator
    const handleTyping = (data: TypingUser & { isTyping: boolean }) => {
      if (data.userId === userId) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (prev.some((u) => u.userId === data.userId)) {
            return prev;
          }
          return [...prev, { userId: data.userId, displayName: data.displayName }];
        } else {
          return prev.filter((u) => u.userId !== data.userId);
        }
      });
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:message-edited', handleMessageEdited);
    socket.on('chat:message-deleted', handleMessageDeleted);
    socket.on('chat:reaction', handleReaction);
    socket.on('chat:user-typing', handleTyping);

    // Load initial messages
    loadMore().catch(console.error);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:message-edited', handleMessageEdited);
      socket.off('chat:message-deleted', handleMessageDeleted);
      socket.off('chat:reaction', handleReaction);
      socket.off('chat:user-typing', handleTyping);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, roomId, userId, loadMore]);

  return {
    messages,
    typingUsers,
    isLoading,
    hasMore,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    setTyping,
    loadMore,
    markAsRead,
  };
}
