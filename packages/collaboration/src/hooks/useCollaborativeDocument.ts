/**
 * useCollaborativeDocument Hook
 *
 * Y.js CRDT document synchronization with:
 * - Real-time sync across clients
 * - Offline support with pending changes
 * - Undo/redo history
 * - Awareness (cursors, selections)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import type { Socket } from 'socket.io-client';
import type { SyncState, DocumentInfo } from '../types';

interface UseCollaborativeDocumentOptions {
  socket: Socket | null;
  documentId: string;
  userId: string;
  displayName: string;
  color: string;
  autoConnect?: boolean;
}

interface AwarenessState {
  userId: string;
  displayName: string;
  color: string;
  cursor?: {
    anchor: number;
    head: number;
  };
  selection?: {
    anchor: { line: number; ch: number };
    head: { line: number; ch: number };
  };
}

interface UseCollaborativeDocumentResult {
  doc: Y.Doc;
  awareness: Awareness;
  syncState: SyncState;
  documentInfo: DocumentInfo | null;
  isConnected: boolean;
  hasPendingChanges: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  getContent: <T>(key: string, type: 'text' | 'array' | 'map') => T;
  getText: (key?: string) => Y.Text;
  getArray: <T>(key?: string) => Y.Array<T>;
  getMap: <T>(key?: string) => Y.Map<T>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  updateAwareness: (state: Partial<AwarenessState>) => void;
  getAwarenessStates: () => Map<number, AwarenessState>;
}

export function useCollaborativeDocument(
  options: UseCollaborativeDocumentOptions
): UseCollaborativeDocumentResult {
  const {
    socket,
    documentId,
    userId,
    displayName,
    color,
    autoConnect = true,
  } = options;

  // Y.js document and awareness - created once and persisted
  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  // Initialize Y.Doc if not already
  if (!docRef.current) {
    docRef.current = new Y.Doc();
    awarenessRef.current = new Awareness(docRef.current);
  }

  const doc = docRef.current;
  const awareness = awarenessRef.current!;

  const [syncState, setSyncState] = useState<SyncState>({
    synced: false,
    pending: false,
    version: 0,
    lastSync: null,
  });
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pendingUpdatesRef = useRef<Uint8Array[]>([]);
  const connectedRef = useRef(false);

  // Set initial awareness state
  useEffect(() => {
    awareness.setLocalStateField('user', {
      userId,
      displayName,
      color,
    });
  }, [awareness, userId, displayName, color]);

  // Connect to document sync
  const connect = useCallback(async (): Promise<void> => {
    if (!socket?.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      // Request document state from server
      socket.emit(
        'doc:connect',
        { documentId },
        (response: {
          success: boolean;
          state?: Uint8Array | number[];
          version?: number;
          error?: string;
        }) => {
          if (response.success && response.state) {
            // Apply server state
            const stateVector = new Uint8Array(response.state);
            Y.applyUpdate(doc, stateVector);

            setIsConnected(true);
            connectedRef.current = true;
            setSyncState({
              synced: true,
              pending: false,
              version: response.version || 0,
              lastSync: new Date(),
            });
            setDocumentInfo({
              id: documentId,
              version: response.version || 0,
              synced: true,
              pending: false,
            });

            // Apply any pending updates
            if (pendingUpdatesRef.current.length > 0) {
              pendingUpdatesRef.current.forEach((update) => {
                socket.emit('doc:update', {
                  documentId,
                  update: Array.from(update),
                  origin: 'pending',
                  clientId: doc.clientID,
                });
              });
              pendingUpdatesRef.current = [];
            }

            resolve();
          } else {
            reject(new Error(response.error || 'Failed to connect to document'));
          }
        }
      );
    });
  }, [socket, documentId, doc]);

  // Disconnect from document sync
  const disconnect = useCallback(() => {
    if (!socket?.connected) return;

    socket.emit('doc:disconnect', { documentId });
    setIsConnected(false);
    connectedRef.current = false;
    setSyncState((prev) => ({ ...prev, synced: false }));
  }, [socket, documentId]);

  // Get content by type
  const getContent = useCallback(
    <T>(key: string, type: 'text' | 'array' | 'map'): T => {
      switch (type) {
        case 'text':
          return doc.getText(key) as T;
        case 'array':
          return doc.getArray(key) as T;
        case 'map':
          return doc.getMap(key) as T;
        default:
          throw new Error(`Unknown content type: ${type}`);
      }
    },
    [doc]
  );

  // Convenience getters
  const getText = useCallback(
    (key = 'content'): Y.Text => doc.getText(key),
    [doc]
  );

  const getArray = useCallback(
    <T>(key = 'items'): Y.Array<T> => doc.getArray(key),
    [doc]
  );

  const getMap = useCallback(
    <T>(key = 'data'): Y.Map<T> => doc.getMap(key),
    [doc]
  );

  // Undo/Redo
  const undo = useCallback(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.undo();
    }
  }, []);

  const redo = useCallback(() => {
    if (undoManagerRef.current) {
      undoManagerRef.current.redo();
    }
  }, []);

  // Update awareness
  const updateAwareness = useCallback(
    (state: Partial<AwarenessState>) => {
      const currentState = awareness.getLocalState() || {};
      awareness.setLocalState({ ...currentState, ...state });
    },
    [awareness]
  );

  // Get all awareness states
  const getAwarenessStates = useCallback((): Map<number, AwarenessState> => {
    return awareness.getStates() as Map<number, AwarenessState>;
  }, [awareness]);

  // Memoized pending changes indicator
  const hasPendingChanges = useMemo(
    () => pendingUpdatesRef.current.length > 0 || syncState.pending,
    [syncState.pending]
  );

  // Set up document observers and sync
  useEffect(() => {
    if (!socket) return;

    // Initialize UndoManager for the main content
    const text = doc.getText('content');
    undoManagerRef.current = new Y.UndoManager(text, {
      trackedOrigins: new Set([null, 'local']),
    });

    // Track undo/redo state
    const updateUndoRedoState = () => {
      setCanUndo(undoManagerRef.current?.canUndo() ?? false);
      setCanRedo(undoManagerRef.current?.canRedo() ?? false);
    };

    undoManagerRef.current.on('stack-item-added', updateUndoRedoState);
    undoManagerRef.current.on('stack-item-popped', updateUndoRedoState);
    undoManagerRef.current.on('stack-cleared', updateUndoRedoState);

    // Handle local updates
    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      // Don't send updates from remote
      if (origin === 'remote') return;

      if (connectedRef.current && socket.connected) {
        // Send update to server
        socket.emit('doc:update', {
          documentId,
          update: Array.from(update),
          origin: origin === null ? 'local' : String(origin),
          clientId: doc.clientID,
        });
        setSyncState((prev) => ({ ...prev, pending: true }));
      } else {
        // Queue for later
        pendingUpdatesRef.current.push(update);
        setSyncState((prev) => ({ ...prev, pending: true }));
      }
    };

    doc.on('update', handleUpdate);

    // Handle remote updates
    const handleRemoteUpdate = (data: {
      documentId: string;
      update: number[];
      version: number;
    }) => {
      if (data.documentId !== documentId) return;

      const update = new Uint8Array(data.update);
      Y.applyUpdate(doc, update, 'remote');
      setSyncState((prev) => ({
        ...prev,
        synced: true,
        pending: false,
        version: data.version,
        lastSync: new Date(),
      }));
    };

    // Handle sync confirmation
    const handleSynced = (data: { documentId: string; version: number }) => {
      if (data.documentId !== documentId) return;

      setSyncState((prev) => ({
        ...prev,
        synced: true,
        pending: false,
        version: data.version,
        lastSync: new Date(),
      }));
    };

    // Handle awareness updates from server
    const handleAwarenessUpdate = (data: {
      clientId: number;
      awareness: AwarenessState;
    }) => {
      if (data.clientId === doc.clientID) return;

      // Update remote client awareness
      awareness.setLocalStateField(`remote-${data.clientId}`, data.awareness);
    };

    socket.on('doc:updated', handleRemoteUpdate);
    socket.on('doc:synced', handleSynced);
    socket.on('doc:awareness-update', handleAwarenessUpdate);

    // Send local awareness updates
    const handleLocalAwarenessChange = (
      changed: { added: number[]; updated: number[]; removed: number[] }
    ) => {
      if (!socket.connected || !connectedRef.current) return;

      const localState = awareness.getLocalState();
      if (localState) {
        socket.emit('doc:awareness', {
          documentId,
          clientId: doc.clientID,
          awareness: localState,
        });
      }
    };

    awareness.on('change', handleLocalAwarenessChange);

    return () => {
      doc.off('update', handleUpdate);
      socket.off('doc:updated', handleRemoteUpdate);
      socket.off('doc:synced', handleSynced);
      socket.off('doc:awareness-update', handleAwarenessUpdate);
      awareness.off('change', handleLocalAwarenessChange);

      if (undoManagerRef.current) {
        undoManagerRef.current.destroy();
      }
    };
  }, [socket, documentId, doc, awareness]);

  // Auto-connect when socket is ready
  useEffect(() => {
    if (autoConnect && socket?.connected && !isConnected) {
      connect().catch(console.error);
    }

    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [autoConnect, socket?.connected, isConnected, connect, disconnect]);

  return {
    doc,
    awareness,
    syncState,
    documentInfo,
    isConnected,
    hasPendingChanges,
    connect,
    disconnect,
    getContent,
    getText,
    getArray,
    getMap,
    undo,
    redo,
    canUndo,
    canRedo,
    updateAwareness,
    getAwarenessStates,
  };
}
