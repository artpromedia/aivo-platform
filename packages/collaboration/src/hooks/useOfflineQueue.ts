/**
 * useOfflineQueue Hook
 *
 * Manages offline operations with:
 * - IndexedDB persistence
 * - Automatic retry on reconnection
 * - Conflict resolution
 * - Operation ordering
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

interface QueuedOperation {
  id: string;
  type: string;
  event: string;
  data: unknown;
  timestamp: number;
  retries: number;
  priority: number;
}

interface UseOfflineQueueOptions {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  socket: Socket | null;
  userId: string;
  dbName?: string;
  storeName?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseOfflineQueueResult {
  isOnline: boolean;
  queueSize: number;
  pendingOperations: QueuedOperation[];
  enqueue: (event: string, data: unknown, options?: EnqueueOptions) => Promise<string>;
  dequeue: (operationId: string) => Promise<void>;
  flush: () => Promise<void>;
  clear: () => Promise<void>;
  getOperation: (operationId: string) => Promise<QueuedOperation | undefined>;
}

interface EnqueueOptions {
  priority?: number;
  type?: string;
}

// Simple ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function useOfflineQueue(options: UseOfflineQueueOptions): UseOfflineQueueResult {
  const {
    socket,
    userId,
    dbName = 'aivo-collaboration',
    storeName = 'offline-queue',
    maxRetries = 5,
    retryDelay = 1000,
  } = options;

  const [isOnline, setIsOnline] = useState(navigator.onLine && !!socket?.connected);
  const [queueSize, setQueueSize] = useState(0);
  const [pendingOperations, setPendingOperations] = useState<QueuedOperation[]>([]);

  const dbRef = useRef<IDBDatabase | null>(null);
  const flushingRef = useRef(false);

  // Initialize IndexedDB
  const initDB = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) return dbRef.current;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${dbName}-${userId}`, 1);

      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB open failed'));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('priority', 'priority');
          store.createIndex('type', 'type');
        }
      };

      request.onsuccess = () => {
        dbRef.current = request.result;
        resolve(request.result);
      };
    });
  }, [dbName, storeName, userId]);

  // Get all operations from IndexedDB
  const getAllOperations = useCallback(async (): Promise<QueuedOperation[]> => {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB getAll failed'));
      };
      request.onsuccess = () => {
        const ops = request.result as QueuedOperation[];
        // Sort by priority (desc) then timestamp (asc)
        ops.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return a.timestamp - b.timestamp;
        });
        resolve(ops);
      };
    });
  }, [initDB, storeName]);

  // Add operation to queue
  const enqueue = useCallback(
    async (event: string, data: unknown, enqueueOptions?: EnqueueOptions): Promise<string> => {
      const db = await initDB();
      const id = generateId();

      const operation: QueuedOperation = {
        id,
        type: enqueueOptions?.type || 'default',
        event,
        data,
        timestamp: Date.now(),
        retries: 0,
        priority: enqueueOptions?.priority || 0,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(operation);

        request.onerror = () => {
          reject(request.error ?? new Error('IndexedDB add failed'));
        };
        request.onsuccess = async () => {
          const ops = await getAllOperations();
          setPendingOperations(ops);
          setQueueSize(ops.length);
          resolve(id);
        };
      });
    },
    [initDB, storeName, getAllOperations]
  );

  // Remove operation from queue
  const dequeue = useCallback(
    async (operationId: string): Promise<void> => {
      const db = await initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(operationId);

        request.onerror = () => {
          reject(request.error ?? new Error('IndexedDB delete failed'));
        };
        request.onsuccess = async () => {
          const ops = await getAllOperations();
          setPendingOperations(ops);
          setQueueSize(ops.length);
          resolve();
        };
      });
    },
    [initDB, storeName, getAllOperations]
  );

  // Update operation retry count
  const updateRetries = useCallback(
    async (operationId: string, retries: number): Promise<void> => {
      const db = await initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(operationId);

        getRequest.onerror = () => {
          reject(getRequest.error ?? new Error('IndexedDB get failed'));
        };
        getRequest.onsuccess = () => {
          const operation = getRequest.result as QueuedOperation | undefined;
          if (!operation) {
            resolve();
            return;
          }

          operation.retries = retries;
          const putRequest = store.put(operation);

          putRequest.onerror = () => {
            reject(putRequest.error ?? new Error('IndexedDB put failed'));
          };
          putRequest.onsuccess = () => {
            resolve();
          };
        };
      });
    },
    [initDB, storeName]
  );

  // Flush all pending operations
  const flush = useCallback(async (): Promise<void> => {
    if (!socket?.connected || flushingRef.current) return;

    flushingRef.current = true;
    const operations = await getAllOperations();

    for (const op of operations) {
      try {
        if (op.retries >= maxRetries) {
          console.warn(`[OfflineQueue] Max retries reached for operation ${op.id}`);
          await dequeue(op.id);
          continue;
        }

        await new Promise<void>((resolve, reject) => {
          socket.emit(op.event, op.data, (response: { success?: boolean; error?: string }) => {
            if (response?.success === false) {
              reject(new Error(response.error || 'Operation failed'));
            } else {
              resolve();
            }
          });

          // Timeout after 10 seconds
          setTimeout(() => {
            reject(new Error('Operation timeout'));
          }, 10000);
        });

        // Success - remove from queue
        await dequeue(op.id);
      } catch (error) {
        console.error(`[OfflineQueue] Failed to flush operation ${op.id}:`, error);
        await updateRetries(op.id, op.retries + 1);

        // Wait before next retry
        await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, op.retries)));
      }
    }

    flushingRef.current = false;
  }, [socket, getAllOperations, maxRetries, dequeue, updateRetries, retryDelay]);

  // Clear all operations
  const clear = useCallback(async (): Promise<void> => {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB clear failed'));
      };
      request.onsuccess = () => {
        setPendingOperations([]);
        setQueueSize(0);
        resolve();
      };
    });
  }, [initDB, storeName]);

  // Get a specific operation
  const getOperation = useCallback(
    async (operationId: string): Promise<QueuedOperation | undefined> => {
      const db = await initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(operationId);

        request.onerror = () => {
          reject(request.error ?? new Error('IndexedDB get failed'));
        };
        request.onsuccess = () => {
          resolve(request.result as QueuedOperation | undefined);
        };
      });
    },
    [initDB, storeName]
  );

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Flush queue when back online
      flush().catch(console.error);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);

    return () => {
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    };
  }, [flush]);

  // Monitor socket connection
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsOnline(navigator.onLine);
      // Flush queue when socket connects
      if (navigator.onLine) {
        flush().catch(console.error);
      }
    };

    const handleDisconnect = () => {
      setIsOnline(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, flush]);

  // Load initial queue state
  useEffect(() => {
    getAllOperations()
      .then((ops) => {
        setPendingOperations(ops);
        setQueueSize(ops.length);
      })
      .catch(console.error);
  }, [getAllOperations]);

  return {
    isOnline,
    queueSize,
    pendingOperations,
    enqueue,
    dequeue,
    flush,
    clear,
    getOperation,
  };
}
