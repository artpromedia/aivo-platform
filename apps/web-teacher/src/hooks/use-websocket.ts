/**
 * WebSocket Hook
 *
 * React hook for managing WebSocket connections with:
 * - Automatic reconnection
 * - Room management
 * - Event subscription
 * - Promise-based emit with acknowledgment
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export interface WebSocketHook {
  socket: Socket | null;
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: <T = unknown>(event: string, data?: unknown) => Promise<T>;
  on: (event: string, handler: (...args: unknown[]) => void) => () => void;
  off: (event: string, handler?: (...args: unknown[]) => void) => void;
  joinRoom: (roomId: string, roomType: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
}

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3003';

/**
 * Custom hook for WebSocket connections
 */
export function useWebSocket(options: UseWebSocketOptions = {}): WebSocketHook {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  // Get token from localStorage or auth context
  const getToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }, []);

  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const handlersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());

  // Initialize socket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('[WebSocket] Cannot connect: no auth token');
      return;
    }

    setStatus('connecting');

    const socket = io(`${REALTIME_URL}`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      timeout: 20000,
    });

    socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('[WebSocket] Connected');
      }
      setStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('[WebSocket] Disconnected:', reason);
      }
      setStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      setStatus('error');
    });

    socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    // Re-emit events to registered handlers
    socket.onAny((event, ...args) => {
      const handlers = handlersRef.current.get(event);
      if (handlers) {
        handlers.forEach((handler) => handler(...args));
      }
    });

    socketRef.current = socket;
  }, [getToken, reconnection, reconnectionAttempts, reconnectionDelay]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  // Emit with promise-based response
  const emit = useCallback(<T = unknown>(event: string, data?: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit(event, data, (response: { error?: string } & T) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response as T);
        }
      });
    });
  }, []);

  // Subscribe to event
  const on = useCallback(
    (event: string, handler: (...args: unknown[]) => void): (() => void) => {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current.get(event)!.add(handler);

      // Return unsubscribe function
      return () => {
        handlersRef.current.get(event)?.delete(handler);
      };
    },
    []
  );

  // Unsubscribe from event
  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (handler) {
      handlersRef.current.get(event)?.delete(handler);
    } else {
      handlersRef.current.delete(event);
    }
  }, []);

  // Join a room
  const joinRoom = useCallback(
    async (roomId: string, roomType: string): Promise<void> => {
      await emit('room:join', { roomId, roomType });
    },
    [emit]
  );

  // Leave a room
  const leaveRoom = useCallback(
    async (roomId: string): Promise<void> => {
      await emit('room:leave', { roomId });
    },
    [emit]
  );

  // Auto-connect when component mounts
  useEffect(() => {
    const token = getToken();
    if (autoConnect && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, getToken, connect, disconnect]);

  return {
    socket: socketRef.current,
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
  };
}
