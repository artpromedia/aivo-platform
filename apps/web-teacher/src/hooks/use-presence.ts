/**
 * Presence Hook
 *
 * React hook for managing user presence with:
 * - Online/offline status tracking
 * - Cursor position broadcasting
 * - Selection state management
 * - Room-based presence queries
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './use-websocket';

export interface UserPresence {
  userId: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  currentRoom?: string;
  cursorPosition?: { x: number; y: number };
  selectedElement?: string;
  device: 'web' | 'mobile' | 'tablet';
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface UsePresenceOptions {
  roomId?: string;
  trackCursor?: boolean;
  trackSelection?: boolean;
  throttleMs?: number;
}

export interface UsePresenceReturn {
  presence: Map<string, UserPresence>;
  onlineCount: number;
  isOnline: (userId: string) => boolean;
  updateStatus: (status: 'online' | 'away' | 'busy') => void;
  updateCursor: (position: { x: number; y: number }) => void;
  updateSelection: (elementId: string | null) => void;
  syncPresence: () => Promise<void>;
}

/**
 * Custom hook for presence management
 */
export function usePresence(options: UsePresenceOptions = {}): UsePresenceReturn {
  const { roomId, trackCursor = false, throttleMs = 50 } = options;
  const { isConnected, emit, on } = useWebSocket({ autoConnect: false });

  const [presence, setPresence] = useState<Map<string, UserPresence>>(new Map());
  const lastCursorUpdate = useRef<number>(0);
  const pendingCursorUpdate = useRef<{ x: number; y: number } | null>(null);
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle presence updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubJoin = on('presence:join', (data: unknown) => {
      const { userId, displayName } = data as { userId: string; displayName: string; roomId: string };
      setPresence((prev) => {
        const next = new Map(prev);
        next.set(userId, {
          userId,
          displayName,
          status: 'online',
          lastSeen: new Date(),
          device: 'web',
        });
        return next;
      });
    });

    const unsubLeave = on('presence:leave', (data: unknown) => {
      const { userId } = data as { userId: string };
      setPresence((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    const unsubUpdate = on('presence:update', (data: unknown) => {
      const update = data as Partial<UserPresence> & { userId: string };
      setPresence((prev) => {
        const next = new Map(prev);
        const existing = next.get(update.userId);
        if (existing) {
          next.set(update.userId, {
            ...existing,
            ...update,
            lastSeen: new Date(),
          });
        }
        return next;
      });
    });

    return () => {
      unsubJoin();
      unsubLeave();
      unsubUpdate();
    };
  }, [isConnected, on]);

  // Sync presence when joining room
  useEffect(() => {
    if (!isConnected || !roomId) return;

    syncPresence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, roomId]);

  // Cursor tracking
  useEffect(() => {
    if (!isConnected || !trackCursor || !roomId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const position = { x: e.clientX, y: e.clientY };

      if (now - lastCursorUpdate.current >= throttleMs) {
        emit('presence:update', { cursorPosition: position });
        lastCursorUpdate.current = now;
        pendingCursorUpdate.current = null;
      } else {
        pendingCursorUpdate.current = position;

        if (!throttleTimer.current) {
          throttleTimer.current = setTimeout(() => {
            if (pendingCursorUpdate.current) {
              emit('presence:update', {
                cursorPosition: pendingCursorUpdate.current,
              });
              lastCursorUpdate.current = Date.now();
              pendingCursorUpdate.current = null;
            }
            throttleTimer.current = null;
          }, throttleMs);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (throttleTimer.current) {
        clearTimeout(throttleTimer.current);
      }
    };
  }, [isConnected, trackCursor, roomId, throttleMs, emit]);

  const syncPresence = useCallback(async () => {
    if (!isConnected) return;

    try {
      const response = await emit<{ presences: UserPresence[] }>('presence:sync', {
        roomId,
      });

      setPresence(new Map(response.presences.map((p) => [p.userId, p])));
    } catch (error) {
      console.error('[Presence] Failed to sync:', error);
    }
  }, [isConnected, roomId, emit]);

  const updateStatus = useCallback(
    (status: 'online' | 'away' | 'busy') => {
      if (!isConnected) return;
      emit('presence:update', { status });
    },
    [isConnected, emit]
  );

  const updateCursor = useCallback(
    (position: { x: number; y: number }) => {
      if (!isConnected) return;
      emit('presence:update', { cursorPosition: position });
    },
    [isConnected, emit]
  );

  const updateSelection = useCallback(
    (elementId: string | null) => {
      if (!isConnected) return;
      emit('presence:update', { selectedElement: elementId || undefined });
    },
    [isConnected, emit]
  );

  const isOnline = useCallback(
    (userId: string): boolean => {
      const userPresence = presence.get(userId);
      return userPresence?.status === 'online';
    },
    [presence]
  );

  return {
    presence,
    onlineCount: Array.from(presence.values()).filter((p) => p.status === 'online')
      .length,
    isOnline,
    updateStatus,
    updateCursor,
    updateSelection,
    syncPresence,
  };
}
