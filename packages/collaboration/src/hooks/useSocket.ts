/**
 * useSocket Hook
 *
 * Manages Socket.io connection with:
 * - Auto-reconnection with exponential backoff
 * - Connection state tracking
 * - Latency monitoring
 * - Event subscription management
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import type { ConnectionState, ConnectionInfo, SocketEvents } from '../types';

interface UseSocketOptions {
  url: string;
  tenantId: string;
  token: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  transports?: ('polling' | 'websocket')[];
}

interface UseSocketResult {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  socket: Socket | null;
  connected: boolean;
  connectionState: ConnectionState;
  connectionInfo: ConnectionInfo | null;
  latency: number;
  connect: () => void;
  disconnect: () => void;
  emit: <E extends keyof SocketEvents>(event: E, ...args: Parameters<SocketEvents[E]>) => void;
  on: <E extends keyof SocketEvents>(event: E, handler: SocketEvents[E]) => () => void;
  once: <E extends keyof SocketEvents>(event: E, handler: SocketEvents[E]) => () => void;
}

export function useSocket(options: UseSocketOptions): UseSocketResult {
  const {
    url,
    tenantId,
    token,
    autoConnect = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 30000,
    timeout = 20000,
    transports = ['websocket', 'polling'],
  } = options;

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- Socket type from socket.io-client
  const socketRef = useRef<Socket | null>(null);
  const latencyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [latency, setLatency] = useState(0);

  // Calculate reconnection delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectionDelay * Math.pow(2, reconnectAttemptRef.current),
      reconnectionDelayMax
    );
    // Add jitter (±10%)
    return delay * (0.9 + Math.random() * 0.2);
  }, [reconnectionDelay, reconnectionDelayMax]);

  // Measure latency
  const measureLatency = useCallback(() => {
    if (!socketRef.current?.connected) return;

    const start = Date.now();
    socketRef.current.emit('ping', () => {
      const roundTrip = Date.now() - start;
      setLatency(roundTrip);
    });
  }, []);

  // Connect to the server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnectionState('connecting');

    const socket = io(url, {
      auth: { token, tenantId },
      transports,
      timeout,
      reconnection: true,
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax,
      forceNew: true,
    });

    socket.on('connect', () => {
      console.log('[useSocket] Connected:', socket.id);
      setConnected(true);
      setConnectionState('connected');
      reconnectAttemptRef.current = 0;

      // Start latency monitoring
      measureLatency();
      latencyIntervalRef.current = setInterval(measureLatency, 30000);
    });

    socket.on('connected', (info: ConnectionInfo) => {
      setConnectionInfo(info);
    });

    socket.on('disconnect', (reason) => {
      console.log('[useSocket] Disconnected:', reason);
      setConnected(false);

      if (latencyIntervalRef.current) {
        clearInterval(latencyIntervalRef.current);
      }

      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setConnectionState('disconnected');
      } else {
        setConnectionState('reconnecting');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[useSocket] Connection error:', error.message);
      reconnectAttemptRef.current++;

      if (reconnectAttemptRef.current >= reconnectionAttempts) {
        setConnectionState('error');
      } else {
        setConnectionState('reconnecting');
      }
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log('[useSocket] Reconnect attempt:', attempt);
      reconnectAttemptRef.current = attempt;
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect', () => {
      console.log('[useSocket] Reconnected');
      reconnectAttemptRef.current = 0;
      setConnectionState('connected');
      setConnected(true);
    });

    socket.io.on('reconnect_failed', () => {
      console.error('[useSocket] Reconnection failed after max attempts');
      setConnectionState('error');
    });

    socketRef.current = socket;
  }, [
    url,
    token,
    tenantId,
    transports,
    timeout,
    reconnectionAttempts,
    reconnectionDelay,
    reconnectionDelayMax,
    measureLatency,
  ]);

  // Disconnect from the server
  const disconnect = useCallback(() => {
    if (latencyIntervalRef.current) {
      clearInterval(latencyIntervalRef.current);
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnected(false);
    setConnectionState('disconnected');
    setConnectionInfo(null);
    setLatency(0);
  }, []);

  // Emit an event
  const emit = useCallback(
    <E extends keyof SocketEvents>(event: E, ...args: Parameters<SocketEvents[E]>) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, ...args);
      } else {
        console.warn('[useSocket] Cannot emit, not connected');
      }
    },
    []
  );

  // Subscribe to an event
  const on = useCallback(
    <E extends keyof SocketEvents>(event: E, handler: SocketEvents[E]): (() => void) => {
      const socket = socketRef.current;
      if (!socket) {
        console.warn('[useSocket] Cannot subscribe, socket not initialized');
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return () => {};
      }

      socket.on(event as string, handler as (...args: unknown[]) => void);

      return () => {
        socket.off(event as string, handler as (...args: unknown[]) => void);
      };
    },
    []
  );

  // Subscribe to an event once
  const once = useCallback(
    <E extends keyof SocketEvents>(event: E, handler: SocketEvents[E]): (() => void) => {
      const socket = socketRef.current;
      if (!socket) {
        console.warn('[useSocket] Cannot subscribe, socket not initialized');
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return () => {};
      }

      socket.once(event as string, handler as (...args: unknown[]) => void);

      return () => {
        socket.off(event as string, handler as (...args: unknown[]) => void);
      };
    },
    []
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && token && tenantId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, token, tenantId, connect, disconnect]);

  return {
    socket: socketRef.current,
    connected,
    connectionState,
    connectionInfo,
    latency,
    connect,
    disconnect,
    emit,
    on,
    once,
  };
}
