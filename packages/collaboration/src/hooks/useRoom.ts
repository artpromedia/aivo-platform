/**
 * useRoom Hook
 *
 * Manages room membership with:
 * - Join/leave operations
 * - User list management
 * - Cursor and selection broadcasting
 * - Permission handling
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

import type {
  RoomState,
  RoomType,
  RoomUser,
  CursorPosition,
  CursorData,
  SelectionData,
  TextRange,
} from '../types';

interface UseRoomOptions {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  socket: Socket | null;
  roomId: string;
  roomType: RoomType;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  autoJoin?: boolean;
  cursorThrottleMs?: number;
}

interface UseRoomResult {
  joined: boolean;
  roomState: RoomState | null;
  users: RoomUser[];
  cursors: Map<string, CursorData>;
  selections: Map<string, SelectionData>;
  userColor: string;
  join: () => Promise<RoomState>;
  leave: () => void;
  updateCursor: (position: CursorPosition, elementId?: string) => void;
  updateSelection: (selection: TextRange | null, elementId?: string) => void;
  broadcast: (event: string, data: unknown) => void;
}

// Generate a consistent color for a user based on their ID
function getUserColor(userId: string): string {
  const colors = [
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // amber
    '#84CC16', // lime
    '#22C55E', // green
    '#14B8A6', // teal
    '#06B6D4', // cyan
    '#0EA5E9', // sky
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#A855F7', // purple
    '#D946EF', // fuchsia
    '#EC4899', // pink
    '#F43F5E', // rose
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}

export function useRoom(options: UseRoomOptions): UseRoomResult {
  const {
    socket,
    roomId,
    roomType,
    userId,
    displayName,
    avatarUrl,
    autoJoin = true,
    cursorThrottleMs = 50,
  } = options;

  const [joined, setJoined] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());
  const [selections, setSelections] = useState<Map<string, SelectionData>>(new Map());

  const userColor = getUserColor(userId);
  const lastCursorEmitRef = useRef(0);
  const pendingCursorRef = useRef<{ position: CursorPosition; elementId?: string } | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join the room
  const join = useCallback(async (): Promise<RoomState> => {
    if (!socket?.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      socket.emit(
        'room:join',
        {
          roomId,
          roomType,
          user: {
            userId,
            displayName,
            avatarUrl,
            color: userColor,
          },
        },
        (response: { success: boolean; state?: RoomState; error?: string }) => {
          if (response.success && response.state) {
            setJoined(true);
            setRoomState(response.state);
            setUsers(response.state.users);
            setCursors(new Map(Object.entries(response.state.cursors || {})));
            setSelections(new Map(Object.entries(response.state.selections || {})));
            resolve(response.state);
          } else {
            reject(new Error(response.error || 'Failed to join room'));
          }
        }
      );
    });
  }, [socket, roomId, roomType, userId, displayName, avatarUrl, userColor]);

  // Leave the room
  const leave = useCallback(() => {
    if (!socket?.connected || !joined) return;

    socket.emit('room:leave', { roomId });
    setJoined(false);
    setRoomState(null);
    setUsers([]);
    setCursors(new Map());
    setSelections(new Map());
  }, [socket, roomId, joined]);

  // Update cursor position (throttled)
  const updateCursor = useCallback(
    (position: CursorPosition, elementId?: string) => {
      if (!socket?.connected || !joined) return;

      pendingCursorRef.current = { position, elementId };

      const now = Date.now();
      const elapsed = now - lastCursorEmitRef.current;

      if (elapsed >= cursorThrottleMs) {
        // Emit immediately
        socket.emit('cursor:move', {
          roomId,
          userId,
          displayName,
          color: userColor,
          position,
          elementId,
          timestamp: now,
        });
        lastCursorEmitRef.current = now;
        pendingCursorRef.current = null;
      } else if (!cursorTimeoutRef.current) {
        // Schedule emit
        cursorTimeoutRef.current = setTimeout(() => {
          if (pendingCursorRef.current && socket.connected) {
            socket.emit('cursor:move', {
              roomId,
              userId,
              displayName,
              color: userColor,
              ...pendingCursorRef.current,
              timestamp: Date.now(),
            });
            lastCursorEmitRef.current = Date.now();
            pendingCursorRef.current = null;
          }
          cursorTimeoutRef.current = null;
        }, cursorThrottleMs - elapsed);
      }
    },
    [socket, joined, roomId, userId, displayName, userColor, cursorThrottleMs]
  );

  // Update text selection
  const updateSelection = useCallback(
    (selection: TextRange | null, elementId?: string) => {
      if (!socket?.connected || !joined) return;

      socket.emit('selection:change', {
        roomId,
        userId,
        displayName,
        color: userColor,
        selection,
        elementId,
        timestamp: Date.now(),
      });
    },
    [socket, joined, roomId, userId, displayName, userColor]
  );

  // Broadcast custom event to room
  const broadcast = useCallback(
    (event: string, data: unknown) => {
      if (!socket?.connected || !joined) return;

      socket.emit('room:broadcast', { roomId, event, data });
    },
    [socket, joined, roomId]
  );

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    // User joined room
    const handleUserJoined = (user: RoomUser) => {
      setUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== user.userId);
        return [...filtered, user];
      });
    };

    // User left room
    const handleUserLeft = (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
      setSelections((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    // Cursor moved
    const handleCursorMoved = (cursor: CursorData) => {
      if (cursor.userId === userId) return;

      setCursors((prev) => {
        const next = new Map(prev);
        next.set(cursor.userId, cursor);
        return next;
      });
    };

    // Selection changed
    const handleSelectionChanged = (selection: SelectionData) => {
      if (selection.userId === userId) return;

      setSelections((prev) => {
        const next = new Map(prev);
        if (selection.selection === null) {
          next.delete(selection.userId);
        } else {
          next.set(selection.userId, selection);
        }
        return next;
      });
    };

    // Room state update
    const handleRoomState = (state: RoomState) => {
      setRoomState(state);
      setUsers(state.users);
    };

    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);
    socket.on('cursor:moved', handleCursorMoved);
    socket.on('selection:changed', handleSelectionChanged);
    socket.on('room:state', handleRoomState);

    return () => {
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
      socket.off('cursor:moved', handleCursorMoved);
      socket.off('selection:changed', handleSelectionChanged);
      socket.off('room:state', handleRoomState);

      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [socket, userId]);

  // Auto-join on mount
  useEffect(() => {
    if (autoJoin && socket?.connected && !joined) {
      join().catch(console.error);
    }

    return () => {
      if (joined) {
        leave();
      }
    };
  }, [autoJoin, socket?.connected, joined, join, leave]);

  return {
    joined,
    roomState,
    users,
    cursors,
    selections,
    userColor,
    join,
    leave,
    updateCursor,
    updateSelection,
    broadcast,
  };
}
