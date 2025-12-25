/**
 * Real-time collaboration hook
 * Handles presence, cursors, and synchronized editing
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface CollaboratorInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color: string;
}

interface CursorPosition {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
  selection?: {
    blockId: string;
    start: number;
    end: number;
  };
  lastUpdate: number;
}

interface UseCollaborationOptions {
  documentId: string;
  documentType: 'lesson' | 'template' | 'activity';
  onRemoteChange?: (change: RemoteChange) => void;
}

interface RemoteChange {
  type: 'insert' | 'update' | 'delete' | 'reorder';
  userId: string;
  data: any;
  timestamp: number;
}

interface UseCollaborationResult {
  collaborators: CollaboratorInfo[];
  cursors: CursorPosition[];
  isConnected: boolean;
  broadcastCursor: (position: { x: number; y: number }) => void;
  broadcastSelection: (blockId: string, start: number, end: number) => void;
  broadcastChange: (change: Omit<RemoteChange, 'userId' | 'timestamp'>) => void;
  lock: (blockId: string) => Promise<boolean>;
  unlock: (blockId: string) => void;
  isLocked: (blockId: string) => boolean;
  lockOwner: (blockId: string) => string | null;
}

// Predefined colors for collaborators
const COLLABORATOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function useCollaboration({
  documentId,
  documentType,
  onRemoteChange,
}: UseCollaborationOptions): UseCollaborationResult {
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [locks, setLocks] = useState<Map<string, string>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

  // Get color for a user
  const getUserColor = useCallback((userId: string): string => {
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/collaboration`;
    const ws = new WebSocket(`${wsUrl}?documentId=${documentId}&documentType=${documentType}`);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Collaboration connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (err) {
        console.error('Failed to parse collaboration message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('Collaboration WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [documentId, documentType]);

  // Handle incoming messages
  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'presence':
        setCollaborators(message.collaborators.map((c: any) => ({
          ...c,
          color: getUserColor(c.id),
        })));
        break;

      case 'cursor':
        setCursors((prev) => {
          const filtered = prev.filter(c => c.userId !== message.userId);
          return [
            ...filtered,
            {
              userId: message.userId,
              userName: message.userName,
              color: getUserColor(message.userId),
              position: message.position,
              selection: message.selection,
              lastUpdate: Date.now(),
            },
          ];
        });
        break;

      case 'change':
        if (onRemoteChange) {
          onRemoteChange({
            type: message.changeType,
            userId: message.userId,
            data: message.data,
            timestamp: message.timestamp,
          });
        }
        break;

      case 'lock':
        setLocks((prev) => {
          const newLocks = new Map(prev);
          if (message.action === 'acquire') {
            newLocks.set(message.blockId, message.userId);
          } else if (message.action === 'release') {
            newLocks.delete(message.blockId);
          }
          return newLocks;
        });
        break;

      case 'user_left':
        setCollaborators((prev) => prev.filter(c => c.id !== message.userId));
        setCursors((prev) => prev.filter(c => c.userId !== message.userId));
        setLocks((prev) => {
          const newLocks = new Map(prev);
          // Release any locks held by the user who left
          for (const [blockId, userId] of newLocks) {
            if (userId === message.userId) {
              newLocks.delete(blockId);
            }
          }
          return newLocks;
        });
        break;
    }
  }, [getUserColor, onRemoteChange]);

  // Clean up stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const staleThreshold = Date.now() - 5000; // 5 seconds
      setCursors((prev) => prev.filter(c => c.lastUpdate > staleThreshold));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Send message helper
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Throttled cursor broadcast
  const broadcastCursor = useCallback((position: { x: number; y: number }) => {
    pendingCursorRef.current = position;

    if (!cursorThrottleRef.current) {
      cursorThrottleRef.current = setTimeout(() => {
        if (pendingCursorRef.current) {
          send({
            type: 'cursor',
            position: pendingCursorRef.current,
          });
          pendingCursorRef.current = null;
        }
        cursorThrottleRef.current = null;
      }, 50); // 20 FPS max
    }
  }, [send]);

  const broadcastSelection = useCallback((blockId: string, start: number, end: number) => {
    send({
      type: 'selection',
      blockId,
      start,
      end,
    });
  }, [send]);

  const broadcastChange = useCallback((change: Omit<RemoteChange, 'userId' | 'timestamp'>) => {
    send({
      type: 'change',
      changeType: change.type,
      data: change.data,
    });
  }, [send]);

  const lock = useCallback(async (blockId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const handleLockResponse = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'lock_response' && message.blockId === blockId) {
            wsRef.current?.removeEventListener('message', handleLockResponse);
            resolve(message.success);
          }
        } catch {
          // Ignore parse errors
        }
      };

      wsRef.current?.addEventListener('message', handleLockResponse);

      send({
        type: 'lock',
        action: 'acquire',
        blockId,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        wsRef.current?.removeEventListener('message', handleLockResponse);
        resolve(false);
      }, 5000);
    });
  }, [send]);

  const unlock = useCallback((blockId: string) => {
    send({
      type: 'lock',
      action: 'release',
      blockId,
    });
  }, [send]);

  const isLocked = useCallback((blockId: string): boolean => {
    return locks.has(blockId);
  }, [locks]);

  const lockOwner = useCallback((blockId: string): string | null => {
    return locks.get(blockId) || null;
  }, [locks]);

  return {
    collaborators,
    cursors,
    isConnected,
    broadcastCursor,
    broadcastSelection,
    broadcastChange,
    lock,
    unlock,
    isLocked,
    lockOwner,
  };
}
