/**
 * useRealtime Hook
 *
 * React hook for real-time collaboration features including:
 * - WebSocket connection management
 * - Collaborator presence tracking
 * - Cursor synchronization
 * - Content change events
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import type { Collaborator, CursorPosition, EditOperation, LockState } from '../api/collaboration';
import { getWebSocketService, type WebSocketService } from '../services/websocket.service';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface UseRealtimeOptions {
  contentId: string;
  versionId: string;
  userId: string;
  userName: string;
  autoConnect?: boolean;
  heartbeatInterval?: number; // in ms
  onUserJoined?: (collaborator: Collaborator) => void;
  onUserLeft?: (userId: string) => void;
  onContentChanged?: (operation: EditOperation) => void;
  onConflict?: (local: EditOperation, remote: EditOperation) => void;
  onError?: (error: Error) => void;
}

export interface UseRealtimeReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: Error | null;

  // Collaborators
  collaborators: Collaborator[];

  // Cursors (map of userId to position)
  cursors: Map<string, CursorPosition>;

  // Block locks
  locks: Map<string, LockState>;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  updateCursor: (position: CursorPosition | null) => void;
  sendOperation: (
    operation: Omit<EditOperation, 'userId' | 'timestamp'>
  ) => Promise<{ operationId: string; applied: boolean }>;
  requestLock: (blockId: string) => Promise<LockState>;
  releaseLock: (blockId: string) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

export function useRealtime(options: UseRealtimeOptions): UseRealtimeReturn {
  const {
    contentId,
    versionId,
    userId,
    userName,
    autoConnect = true,
    heartbeatInterval = 30000, // 30 seconds
    onUserJoined,
    onUserLeft,
    onContentChanged,
    onConflict,
    onError,
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [locks, setLocks] = useState<Map<string, LockState>>(new Map());

  // Refs
  const wsRef = useRef<WebSocketService | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  // ────────────────────────────────────────────────────────────────────────────
  // HEARTBEAT
  // ────────────────────────────────────────────────────────────────────────────

  const startHeartbeat = useCallback(
    (ws: WebSocketService) => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      heartbeatRef.current = setInterval(() => {
        ws.sendHeartbeat();
      }, heartbeatInterval);
    },
    [heartbeatInterval]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // STATE UPDATER HELPERS (extracted to reduce nesting)
  // ────────────────────────────────────────────────────────────────────────────

  const addOrUpdateCollaborator = useCallback((collaborator: Collaborator) => {
    setCollaborators((prev) => [
      ...prev.filter((c) => c.userId !== collaborator.userId),
      collaborator,
    ]);
  }, []);

  const removeCollaborator = useCallback((leftUserId: string) => {
    setCollaborators((prev) => prev.filter((c) => c.userId !== leftUserId));
    setCursors((prev) => {
      const next = new Map(prev);
      next.delete(leftUserId);
      return next;
    });
  }, []);

  const updateCursorPosition = useCallback((cursorUserId: string, position: CursorPosition) => {
    setCursors((prev) => new Map(prev).set(cursorUserId, position));
  }, []);

  const addLock = useCallback((blockId: string, lock: LockState) => {
    setLocks((prev) => new Map(prev).set(blockId, lock));
  }, []);

  const removeLock = useCallback((blockId: string) => {
    setLocks((prev) => {
      const next = new Map(prev);
      next.delete(blockId);
      return next;
    });
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ────────────────────────────────────────────────────────────────────────────

  const setupEventListeners = useCallback(
    (ws: WebSocketService) => {
      const unsubs: (() => void)[] = [
        // User joined
        ws.on<Collaborator>('user_joined', (collaborator) => {
          addOrUpdateCollaborator(collaborator);
          onUserJoined?.(collaborator);
        }),

        // User left
        ws.on<{ userId: string }>('user_left', ({ userId: leftUserId }) => {
          removeCollaborator(leftUserId);
          onUserLeft?.(leftUserId);
        }),

        // Cursor moved
        ws.on<{ userId: string; position: CursorPosition }>(
          'cursor_moved',
          ({ userId: cursorUserId, position }) => {
            updateCursorPosition(cursorUserId, position);
          }
        ),

        // Block locked
        ws.on<{ blockId: string; lock: LockState }>('block_locked', ({ blockId, lock }) => {
          addLock(blockId, lock);
        }),

        // Block unlocked
        ws.on<{ blockId: string }>('block_unlocked', ({ blockId }) => {
          removeLock(blockId);
        }),

        // Content changed
        ws.on<{ operation: EditOperation }>('content_changed', ({ operation }) => {
          ws.acknowledgeOperation(operation.id);
          onContentChanged?.(operation);
        }),

        // Presence update
        ws.on<{ collaborators: Collaborator[] }>(
          'presence_update',
          ({ collaborators: updatedCollaborators }) => {
            setCollaborators(updatedCollaborators);
          }
        ),

        // Conflict detected
        ws.on<{ operation: EditOperation; conflictWith: EditOperation }>(
          'conflict_detected',
          ({ operation, conflictWith }) => {
            onConflict?.(operation, conflictWith);
          }
        ),

        // Error
        ws.on<{ message: string }>('error', ({ message }) => {
          const error = new Error(message);
          setConnectionError(error);
          onError?.(error);
        }),
      ];

      unsubscribesRef.current = unsubs;
    },
    [
      addOrUpdateCollaborator,
      removeCollaborator,
      updateCursorPosition,
      addLock,
      removeLock,
      onUserJoined,
      onUserLeft,
      onContentChanged,
      onConflict,
      onError,
    ]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // CONNECTION
  // ────────────────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const ws = getWebSocketService();
      wsRef.current = ws;

      // Connect to server
      await ws.connect();

      // Join the room
      const roomCollaborators = await ws.joinRoom({
        contentId,
        versionId,
        userId,
        userName,
      });

      setCollaborators(roomCollaborators);
      setIsConnected(true);

      // Setup event listeners
      setupEventListeners(ws);

      // Start heartbeat
      startHeartbeat(ws);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Connection failed');
      setConnectionError(err);
      onError?.(err);
    } finally {
      setIsConnecting(false);
    }
  }, [
    contentId,
    versionId,
    userId,
    userName,
    isConnected,
    isConnecting,
    onError,
    setupEventListeners,
    startHeartbeat,
  ]);

  const disconnect = useCallback(() => {
    // Stop heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    // Unsubscribe from events
    unsubscribesRef.current.forEach((unsub) => {
      unsub();
    });
    unsubscribesRef.current = [];

    // Disconnect
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }

    // Reset state
    setIsConnected(false);
    setCollaborators([]);
    setCursors(new Map());
    setLocks(new Map());
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ────────────────────────────────────────────────────────────────────────────

  const updateCursor = useCallback((position: CursorPosition | null) => {
    wsRef.current?.updateCursor(position);
  }, []);

  const sendOperation = useCallback(
    async (
      operation: Omit<EditOperation, 'userId' | 'timestamp'>
    ): Promise<{ operationId: string; applied: boolean }> => {
      if (!wsRef.current) {
        throw new Error('Not connected');
      }
      return wsRef.current.sendOperation(operation);
    },
    []
  );

  const requestLock = useCallback(async (blockId: string): Promise<LockState> => {
    if (!wsRef.current) {
      throw new Error('Not connected');
    }
    return wsRef.current.requestBlockLock(blockId);
  }, []);

  const releaseLock = useCallback((blockId: string) => {
    wsRef.current?.releaseBlockLock(blockId);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ────────────────────────────────────────────────────────────────────────────

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      void connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect when version changes
  useEffect(() => {
    if (isConnected && wsRef.current) {
      // Leave current room and join new one
      wsRef.current.leaveRoom();
      wsRef.current
        .joinRoom({ contentId, versionId, userId, userName })
        .then((newCollaborators) => {
          setCollaborators(newCollaborators);
          setCursors(new Map());
          setLocks(new Map());
        })
        .catch((error: unknown) => {
          const err = error instanceof Error ? error : new Error('Failed to rejoin room');
          onError?.(err);
        });
    }
  }, [versionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    isConnecting,
    connectionError,
    collaborators,
    cursors,
    locks,
    connect,
    disconnect,
    updateCursor,
    sendOperation,
    requestLock,
    releaseLock,
  };
}

export default useRealtime;
