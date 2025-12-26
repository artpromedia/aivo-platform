/**
 * usePresence Hook
 *
 * Manages user presence with:
 * - Status updates (online, away, busy, offline)
 * - Custom status messages
 * - Automatic idle detection
 * - Visibility change handling
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { PresenceUser, UserStatus } from '../types';

interface UsePresenceOptions {
  socket: Socket | null;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  idleTimeout?: number;
  awayTimeout?: number;
  heartbeatInterval?: number;
}

interface UsePresenceResult {
  status: UserStatus;
  customStatus: string;
  onlineUsers: Map<string, PresenceUser>;
  setStatus: (status: UserStatus) => void;
  setCustomStatus: (message: string) => void;
  getUser: (userId: string) => PresenceUser | undefined;
  isUserOnline: (userId: string) => boolean;
}

export function usePresence(options: UsePresenceOptions): UsePresenceResult {
  const {
    socket,
    userId,
    displayName,
    avatarUrl,
    idleTimeout = 3 * 60 * 1000, // 3 minutes
    awayTimeout = 10 * 60 * 1000, // 10 minutes
    heartbeatInterval = 30000, // 30 seconds
  } = options;

  const [status, setStatusState] = useState<UserStatus>('online');
  const [customStatus, setCustomStatusState] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map());

  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const awayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<UserStatus>('online');

  // Send presence update to server
  const sendPresenceUpdate = useCallback(
    (newStatus: UserStatus, newCustomStatus?: string) => {
      if (!socket?.connected) return;

      socket.emit('presence:update', {
        status: newStatus,
        customStatus: newCustomStatus ?? customStatus,
      });
    },
    [socket, customStatus]
  );

  // Update status
  const setStatus = useCallback(
    (newStatus: UserStatus) => {
      if (newStatus === status) return;

      previousStatusRef.current = status;
      setStatusState(newStatus);
      sendPresenceUpdate(newStatus);
    },
    [status, sendPresenceUpdate]
  );

  // Update custom status
  const setCustomStatus = useCallback(
    (message: string) => {
      setCustomStatusState(message);
      sendPresenceUpdate(status, message);
    },
    [status, sendPresenceUpdate]
  );

  // Get a specific user
  const getUser = useCallback(
    (targetUserId: string): PresenceUser | undefined => {
      return onlineUsers.get(targetUserId);
    },
    [onlineUsers]
  );

  // Check if a user is online
  const isUserOnline = useCallback(
    (targetUserId: string): boolean => {
      const user = onlineUsers.get(targetUserId);
      return user?.status !== 'offline';
    },
    [onlineUsers]
  );

  // Reset activity timers
  const resetActivityTimers = useCallback(() => {
    lastActivityRef.current = Date.now();

    // If we were idle/away, go back online
    if (status === 'away' && previousStatusRef.current !== 'busy') {
      setStatus('online');
    }

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      if (status === 'online') {
        setStatus('away');
      }
    }, idleTimeout);

    // Reset away timer
    if (awayTimerRef.current) {
      clearTimeout(awayTimerRef.current);
    }
  }, [status, idleTimeout, setStatus]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // User switched tabs or minimized
      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current);
      }
      awayTimerRef.current = setTimeout(() => {
        if (status === 'online') {
          setStatus('away');
        }
      }, awayTimeout);
    } else {
      // User came back
      resetActivityTimers();
    }
  }, [status, awayTimeout, setStatus, resetActivityTimers]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    resetActivityTimers();
  }, [resetActivityTimers]);

  // Initialize presence and event listeners
  useEffect(() => {
    if (!socket?.connected) return;

    // Send initial presence
    socket.emit('presence:join', {
      userId,
      displayName,
      avatarUrl,
      status: 'online',
    });

    // Listen for presence changes
    const handlePresenceChanged = (presence: PresenceUser) => {
      setOnlineUsers((prev) => {
        const next = new Map(prev);
        if (presence.status === 'offline') {
          next.delete(presence.userId);
        } else {
          next.set(presence.userId, presence);
        }
        return next;
      });
    };

    // Listen for initial presence list
    const handlePresenceList = (users: PresenceUser[]) => {
      setOnlineUsers(new Map(users.map((u) => [u.userId, u])));
    };

    socket.on('presence:changed', handlePresenceChanged);
    socket.on('presence:list', handlePresenceList);

    // Request current presence list
    socket.emit('presence:get-list');

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      socket.emit('presence:heartbeat', { timestamp: Date.now() });
    }, heartbeatInterval);

    // Activity listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start activity timers
    resetActivityTimers();

    return () => {
      // Cleanup
      socket.off('presence:changed', handlePresenceChanged);
      socket.off('presence:list', handlePresenceList);

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current);
      }

      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Send offline status
      socket.emit('presence:leave');
    };
  }, [
    socket,
    userId,
    displayName,
    avatarUrl,
    heartbeatInterval,
    handleActivity,
    handleVisibilityChange,
    resetActivityTimers,
  ]);

  return {
    status,
    customStatus,
    onlineUsers,
    setStatus,
    setCustomStatus,
    getUser,
    isUserOnline,
  };
}
