/**
 * CollaborationProvider Component
 *
 * React context provider for collaboration features:
 * - Socket connection management
 * - Presence tracking
 * - Room management
 * - Document sync
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { Socket } from 'socket.io-client';

import { usePresence } from '../hooks/usePresence';
import { useSocket } from '../hooks/useSocket';
import type { ConnectionState, ConnectionInfo, PresenceUser, UserStatus } from '../types';

interface CollaborationContextValue {
  // Connection
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  socket: Socket | null;
  connected: boolean;
  connectionState: ConnectionState;
  connectionInfo: ConnectionInfo | null;
  latency: number;
  connect: () => void;
  disconnect: () => void;

  // User info
  userId: string;
  displayName: string;
  avatarUrl?: string;
  tenantId: string;

  // Presence
  status: UserStatus;
  customStatus: string;
  onlineUsers: Map<string, PresenceUser>;
  setStatus: (status: UserStatus) => void;
  setCustomStatus: (message: string) => void;
  isUserOnline: (userId: string) => boolean;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

export interface CollaborationProviderProps {
  children: ReactNode;
  serverUrl: string;
  token: string;
  userId: string;
  displayName: string;
  tenantId: string;
  avatarUrl?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  children,
  serverUrl,
  token,
  userId,
  displayName,
  tenantId,
  avatarUrl,
  autoConnect = true,
  reconnectionAttempts = 10,
  reconnectionDelay = 1000,
}) => {
  // Socket connection
  const { socket, connected, connectionState, connectionInfo, latency, connect, disconnect } =
    useSocket({
      url: serverUrl,
      tenantId,
      token,
      autoConnect,
      reconnectionAttempts,
      reconnectionDelay,
    });

  // Presence tracking
  const { status, customStatus, onlineUsers, setStatus, setCustomStatus, isUserOnline } =
    usePresence({
      socket,
      userId,
      displayName,
      avatarUrl,
    });

  const value = useMemo<CollaborationContextValue>(
    () => ({
      // Connection
      socket,
      connected,
      connectionState,
      connectionInfo,
      latency,
      connect,
      disconnect,

      // User info
      userId,
      displayName,
      avatarUrl,
      tenantId,

      // Presence
      status,
      customStatus,
      onlineUsers,
      setStatus,
      setCustomStatus,
      isUserOnline,
    }),
    [
      socket,
      connected,
      connectionState,
      connectionInfo,
      latency,
      connect,
      disconnect,
      userId,
      displayName,
      avatarUrl,
      tenantId,
      status,
      customStatus,
      onlineUsers,
      setStatus,
      setCustomStatus,
      isUserOnline,
    ]
  );

  return <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>;
};

export function useCollaboration(): CollaborationContextValue {
  const context = useContext(CollaborationContext);

  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }

  return context;
}
