/**
 * Messaging WebSocket Client
 * Sprint 1.8: Integrate Web Parent Messaging with messaging-svc
 *
 * Provides real-time messaging functionality via WebSocket connection
 * with automatic reconnection, heartbeat, and React Query cache integration.
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback, useState } from 'react';

import { isDevMode } from '@/lib/api/client';
import type {
  Message,
  Conversation,
  TypingIndicator,
  ReadReceipt,
  MessagePage,
  ConversationsPage,
} from '@/lib/api/messaging.api';

// Re-export types needed by consumers
export type { TypingIndicator, ReadReceipt };

// ============================================================================
// Types
// ============================================================================

/**
 * WebSocket connection states
 */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

/**
 * WebSocket message types from server
 */
export type ServerMessageType =
  | 'message.new'
  | 'message.updated'
  | 'message.deleted'
  | 'message.read'
  | 'conversation.updated'
  | 'conversation.new'
  | 'typing.start'
  | 'typing.stop'
  | 'presence.update'
  | 'connection.ack'
  | 'error'
  | 'pong';

/**
 * WebSocket message types to server
 */
export type ClientMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'typing.start'
  | 'typing.stop'
  | 'ping';

/**
 * Server message payload
 */
export interface ServerMessage {
  type: ServerMessageType;
  payload: unknown;
  timestamp: string;
  correlationId?: string;
}

/**
 * Client message payload
 */
export interface ClientMessage {
  type: ClientMessageType;
  payload: unknown;
  correlationId?: string;
}

/**
 * New message event payload
 */
export interface NewMessageEvent {
  message: Message;
  conversation: Conversation;
}

/**
 * Message updated event payload
 */
export interface MessageUpdatedEvent {
  message: Message;
  conversationId: string;
}

/**
 * Message deleted event payload
 */
export interface MessageDeletedEvent {
  messageId: string;
  conversationId: string;
}

/**
 * Typing event payload
 */
export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

/**
 * Presence update payload
 */
export interface PresenceEvent {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
}

/**
 * WebSocket configuration options
 */
export interface WebSocketConfig {
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

/**
 * Event handlers for WebSocket events
 */
export interface MessageSocketHandlers {
  onMessage?: (message: Message, conversation: Conversation) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string, conversationId: string) => void;
  onTyping?: (indicator: TypingIndicator) => void;
  onReadReceipt?: (receipt: ReadReceipt) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.aivo.com/ws',
  reconnectAttempts: 5,
  reconnectDelay: 3000,
  heartbeatInterval: 30000,
  debug: false,
};

// Query keys for React Query cache updates
export const messagingQueryKeys = {
  conversations: (options?: { includeArchived?: boolean }) =>
    ['messaging', 'conversations', options] as const,
  conversation: (id: string) => ['messaging', 'conversation', id] as const,
  messages: (conversationId: string) => ['messaging', 'messages', conversationId] as const,
  unreadCounts: () => ['messaging', 'unread'] as const,
};

// ============================================================================
// WebSocket Manager Class
// ============================================================================

class MessagingSocketManager {
  private socket: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: MessageSocketHandlers = {};
  private connectionState: ConnectionState = 'disconnected';
  private subscribedConversations = new Set<string>();
  private userId: string | null = null;
  private authToken: string | null = null;

  constructor(config?: WebSocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to WebSocket server
   */
  connect(userId: string, authToken: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.log('Already connected');
      return;
    }

    this.userId = userId;
    this.authToken = authToken;
    this.connectionState = 'connecting';
    this.notifyConnectionChange('connecting');

    // In dev mode, simulate connection
    if (isDevMode()) {
      this.log('Dev mode: Simulating WebSocket connection');
      setTimeout(() => {
        this.connectionState = 'connected';
        this.notifyConnectionChange('connected');
        this.startHeartbeat();
      }, 500);
      return;
    }

    try {
      const wsUrl = new URL(this.config.url);
      wsUrl.searchParams.set('userId', userId);
      wsUrl.searchParams.set('token', authToken);

      this.socket = new WebSocket(wsUrl.toString());

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      this.log('Failed to create WebSocket:', error);
      this.notifyConnectionChange('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.subscribedConversations.clear();

    if (this.socket) {
      this.socket.onclose = null; // Prevent reconnect
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.connectionState = 'disconnected';
    this.notifyConnectionChange('disconnected');
    this.log('Disconnected');
  }

  /**
   * Subscribe to a conversation for real-time updates
   */
  subscribeToConversation(conversationId: string): void {
    this.subscribedConversations.add(conversationId);

    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        payload: { conversationId },
      });
    }
  }

  /**
   * Unsubscribe from a conversation
   */
  unsubscribeFromConversation(conversationId: string): void {
    this.subscribedConversations.delete(conversationId);

    if (this.isConnected()) {
      this.send({
        type: 'unsubscribe',
        payload: { conversationId },
      });
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    if (!this.isConnected()) return;

    this.send({
      type: isTyping ? 'typing.start' : 'typing.stop',
      payload: { conversationId },
    });
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: MessageSocketHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    if (isDevMode()) {
      return this.connectionState === 'connected';
    }
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private handleOpen(): void {
    this.log('Connected');
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.notifyConnectionChange('connected');
    this.startHeartbeat();

    // Resubscribe to conversations
    this.subscribedConversations.forEach((conversationId) => {
      this.send({
        type: 'subscribe',
        payload: { conversationId },
      });
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data as string) as ServerMessage;
      this.log('Received:', message.type);

      switch (message.type) {
        case 'message.new':
          this.handleNewMessage(message.payload as NewMessageEvent);
          break;

        case 'message.updated':
          this.handleMessageUpdated(message.payload as MessageUpdatedEvent);
          break;

        case 'message.deleted':
          this.handleMessageDeleted(message.payload as MessageDeletedEvent);
          break;

        case 'message.read':
          this.handleReadReceipt(message.payload as ReadReceipt);
          break;

        case 'conversation.updated':
        case 'conversation.new':
          this.handleConversationUpdated(message.payload as Conversation);
          break;

        case 'typing.start':
        case 'typing.stop':
          this.handleTypingEvent(message.payload as TypingEvent);
          break;

        case 'pong':
          // Heartbeat response
          break;

        case 'error':
          this.log('Server error:', message.payload);
          this.handlers.onError?.(new Error(String(message.payload)));
          break;

        default:
          this.log('Unknown message type:', message.type);
      }
    } catch (error) {
      this.log('Failed to parse message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    this.log('Connection closed:', event.code, event.reason);
    this.stopHeartbeat();
    this.connectionState = 'disconnected';
    this.notifyConnectionChange('disconnected');

    // Don't reconnect if closed normally
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    this.log('WebSocket error:', event);
    this.connectionState = 'error';
    this.notifyConnectionChange('error');
    this.handlers.onError?.(new Error('WebSocket error'));
  }

  private handleNewMessage(event: NewMessageEvent): void {
    this.handlers.onMessage?.(event.message, event.conversation);
  }

  private handleMessageUpdated(event: MessageUpdatedEvent): void {
    this.handlers.onMessageUpdated?.(event.message);
  }

  private handleMessageDeleted(event: MessageDeletedEvent): void {
    this.handlers.onMessageDeleted?.(event.messageId, event.conversationId);
  }

  private handleTypingEvent(event: TypingEvent): void {
    this.handlers.onTyping?.({
      conversationId: event.conversationId,
      userId: event.userId,
      userName: event.userName,
      isTyping: event.isTyping,
    });
  }

  private handleReadReceipt(receipt: ReadReceipt): void {
    this.handlers.onReadReceipt?.(receipt);
  }

  private handleConversationUpdated(conversation: Conversation): void {
    this.handlers.onConversationUpdated?.(conversation);
  }

  private send(message: ClientMessage): void {
    if (!this.isConnected() || !this.socket) {
      this.log('Cannot send - not connected');
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      this.log('Failed to send message:', error);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    if (isDevMode()) {
      // In dev mode, just log
      this.heartbeatTimer = setInterval(() => {
        this.log('Dev mode: Heartbeat ping');
      }, this.config.heartbeatInterval);
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', payload: {} });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.log('Max reconnect attempts reached');
      this.connectionState = 'error';
      this.notifyConnectionChange('error');
      return;
    }

    this.clearReconnectTimer();
    this.connectionState = 'reconnecting';
    this.notifyConnectionChange('reconnecting');

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.userId && this.authToken) {
        this.connect(this.userId, this.authToken);
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyConnectionChange(state: ConnectionState): void {
    this.handlers.onConnectionChange?.(state);
  }

  private log(...args: unknown[]): void {
    if (this.config.debug || isDevMode()) {
      console.log('[MessagingSocket]', ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let socketManagerInstance: MessagingSocketManager | null = null;

export function getMessagingSocket(config?: WebSocketConfig): MessagingSocketManager {
  if (!socketManagerInstance) {
    socketManagerInstance = new MessagingSocketManager(config);
  }
  return socketManagerInstance;
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to manage WebSocket connection with React Query cache integration
 */
export function useMessagingSocket(
  userId: string | null,
  authToken: string | null,
  options?: {
    onMessage?: (message: Message, conversation: Conversation) => void;
    onTyping?: (indicator: TypingIndicator) => void;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  const socketRef = useRef<MessagingSocketManager | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [typingIndicators, setTypingIndicators] = useState<Map<string, TypingIndicator>>(new Map());

  // Clear typing indicator after timeout
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTypingIndicator = useCallback((conversationId: string) => {
    const timeoutId = typingTimeoutRef.current.get(conversationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      typingTimeoutRef.current.delete(conversationId);
    }
    setTypingIndicators((prev) => {
      const next = new Map(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  // Handle incoming message - update React Query cache
  const handleNewMessage = useCallback(
    (message: Message, conversation: Conversation) => {
      // Update messages cache
      queryClient.setQueryData<MessagePage>(
        messagingQueryKeys.messages(message.conversationId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...old.messages, message],
          };
        }
      );

      // Update conversations cache
      queryClient.setQueryData<ConversationsPage>(messagingQueryKeys.conversations(), (old) => {
        if (!old) return old;
        return {
          ...old,
          conversations: old.conversations.map((c) =>
            c.id === conversation.id ? conversation : c
          ),
          totalUnread: old.conversations.reduce((sum, c) => {
            if (c.id === conversation.id) {
              return sum + conversation.unreadCount;
            }
            return sum + c.unreadCount;
          }, 0),
        };
      });

      // Clear typing indicator for this conversation
      clearTypingIndicator(message.conversationId);

      // Call user's onMessage handler
      options?.onMessage?.(message, conversation);
    },
    [queryClient, clearTypingIndicator, options]
  );

  // Handle typing indicator
  const handleTyping = useCallback(
    (indicator: TypingIndicator) => {
      if (indicator.isTyping) {
        setTypingIndicators((prev) => {
          const next = new Map(prev);
          next.set(indicator.conversationId, indicator);
          return next;
        });

        // Clear after 5 seconds if no update
        const timeoutId = setTimeout(() => {
          clearTypingIndicator(indicator.conversationId);
        }, 5000);

        const oldTimeoutId = typingTimeoutRef.current.get(indicator.conversationId);
        if (oldTimeoutId) {
          clearTimeout(oldTimeoutId);
        }
        typingTimeoutRef.current.set(indicator.conversationId, timeoutId);
      } else {
        clearTypingIndicator(indicator.conversationId);
      }

      options?.onTyping?.(indicator);
    },
    [clearTypingIndicator, options]
  );

  // Handle read receipt - update message in cache
  const handleReadReceipt = useCallback(
    (receipt: ReadReceipt) => {
      queryClient.setQueryData<MessagePage>(
        messagingQueryKeys.messages(receipt.conversationId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((msg) =>
              msg.id === receipt.messageId ? { ...msg, readAt: receipt.readAt } : msg
            ),
          };
        }
      );
    },
    [queryClient]
  );

  // Handle conversation update
  const handleConversationUpdated = useCallback(
    (conversation: Conversation) => {
      queryClient.setQueryData<ConversationsPage>(messagingQueryKeys.conversations(), (old) => {
        if (!old) return old;

        const exists = old.conversations.some((c) => c.id === conversation.id);
        if (exists) {
          return {
            ...old,
            conversations: old.conversations.map((c) =>
              c.id === conversation.id ? conversation : c
            ),
          };
        }

        // New conversation
        return {
          ...old,
          conversations: [conversation, ...old.conversations],
          totalCount: old.totalCount + 1,
        };
      });
    },
    [queryClient]
  );

  // Handle message deleted
  const handleMessageDeleted = useCallback(
    (messageId: string, conversationId: string) => {
      queryClient.setQueryData<MessagePage>(messagingQueryKeys.messages(conversationId), (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.filter((msg) => msg.id !== messageId),
        };
      });
    },
    [queryClient]
  );

  // Handle message updated
  const handleMessageUpdated = useCallback(
    (message: Message) => {
      queryClient.setQueryData<MessagePage>(
        messagingQueryKeys.messages(message.conversationId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((msg) => (msg.id === message.id ? message : msg)),
          };
        }
      );
    },
    [queryClient]
  );

  // Connect/disconnect based on userId and enabled flag
  useEffect(() => {
    const enabled = options?.enabled !== false;

    if (!userId || !authToken || !enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      return;
    }

    const socket = getMessagingSocket({ debug: isDevMode() });
    socketRef.current = socket;

    socket.setHandlers({
      onMessage: handleNewMessage,
      onTyping: handleTyping,
      onReadReceipt: handleReadReceipt,
      onConversationUpdated: handleConversationUpdated,
      onMessageUpdated: handleMessageUpdated,
      onMessageDeleted: handleMessageDeleted,
      onConnectionChange: setConnectionState,
      onError: (error) => {
        console.error('[MessagingSocket] Error:', error);
      },
    });

    socket.connect(userId, authToken);

    return () => {
      socket.disconnect();
    };
  }, [
    userId,
    authToken,
    options?.enabled,
    handleNewMessage,
    handleTyping,
    handleReadReceipt,
    handleConversationUpdated,
    handleMessageUpdated,
    handleMessageDeleted,
  ]);

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    const timeoutMap = typingTimeoutRef.current;
    return () => {
      timeoutMap.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutMap.clear();
    };
  }, []);

  // Subscribe to conversation
  const subscribeToConversation = useCallback((conversationId: string) => {
    socketRef.current?.subscribeToConversation(conversationId);
  }, []);

  // Unsubscribe from conversation
  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    socketRef.current?.unsubscribeFromConversation(conversationId);
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    socketRef.current?.sendTypingIndicator(conversationId, isTyping);
  }, []);

  // Get typing indicator for a conversation
  const getTypingIndicator = useCallback(
    (conversationId: string): TypingIndicator | undefined => {
      return typingIndicators.get(conversationId);
    },
    [typingIndicators]
  );

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    typingIndicators,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTypingIndicator,
    getTypingIndicator,
  };
}

/**
 * Hook to subscribe to a specific conversation
 */
export function useConversationSubscription(conversationId: string | null) {
  const socketRef = useRef<MessagingSocketManager | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const socket = getMessagingSocket();
    socketRef.current = socket;

    socket.subscribeToConversation(conversationId);

    return () => {
      socket.unsubscribeFromConversation(conversationId);
    };
  }, [conversationId]);
}
