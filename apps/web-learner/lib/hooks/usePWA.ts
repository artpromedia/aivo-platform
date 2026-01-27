'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isOfflineReady: boolean;
  cacheStatus: Record<string, number> | null;
}

interface UsePWAReturn extends PWAState {
  install: () => Promise<boolean>;
  update: () => void;
  clearCache: () => Promise<void>;
  precacheRoute: (url: string) => Promise<void>;
}

/**
 * Hook for PWA functionality
 *
 * Features:
 * - Install prompt handling
 * - Online/offline detection
 * - Service worker updates
 * - Cache management
 * - Offline content precaching
 */
export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdateAvailable: false,
    isOfflineReady: false,
    cacheStatus: null,
  });

  const deferredPromptRef = useRef<any>(null);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Register service worker and set up listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        swRegistrationRef.current = registration;

        // Check if already installed (has active worker)
        if (registration.active) {
          setState((prev) => ({ ...prev, isOfflineReady: true }));
        }

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setState((prev) => ({ ...prev, isUpdateAvailable: true }));
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SW_UPDATED') {
            setState((prev) => ({ ...prev, isUpdateAvailable: true }));
          }
          if (event.data.type === 'OFFLINE_READY') {
            setState((prev) => ({ ...prev, isOfflineReady: true }));
          }
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    registerSW();

    // Check if app is installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setState((prev) => ({ ...prev, isInstalled: true }));
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setState((prev) => ({ ...prev, isInstallable: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
      }));
      deferredPromptRef.current = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Online/offline detection
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Install the PWA
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPromptRef.current) {
      console.warn('Install prompt not available');
      return false;
    }

    try {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === 'accepted') {
        setState((prev) => ({
          ...prev,
          isInstalled: true,
          isInstallable: false,
        }));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, []);

  // Update the service worker
  const update = useCallback(() => {
    if (swRegistrationRef.current?.waiting) {
      swRegistrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, []);

  // Clear all caches
  const clearCache = useCallback(async (): Promise<void> => {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active service worker');
      return;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.success) {
          setState((prev) => ({ ...prev, cacheStatus: {} }));
          resolve();
        }
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );
    });
  }, []);

  // Precache a specific route
  const precacheRoute = useCallback(async (url: string): Promise<void> => {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active service worker');
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'PRECACHE_ROUTE',
      url,
    });
  }, []);

  return {
    ...state,
    install,
    update,
    clearCache,
    precacheRoute,
  };
}

/**
 * Hook for offline queue management
 * Queues operations when offline and syncs when back online
 */
export function useOfflineQueue<T extends { id: string }>() {
  const [queue, setQueue] = useState<T[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = usePWA();

  const add = useCallback((item: T) => {
    setQueue((prev) => [...prev, item]);

    // Store in IndexedDB for persistence
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      storeOfflineItem(item);
    }
  }, []);

  const remove = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));

    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      removeOfflineItem(id);
    }
  }, []);

  const clear = useCallback(() => {
    setQueue([]);
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      clearOfflineItems();
    }
  }, []);

  // Trigger background sync when online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          (registration as any).sync.register('sync-submissions');
        });
      }
    }
  }, [isOnline, queue.length, isSyncing]);

  return {
    queue,
    add,
    remove,
    clear,
    isSyncing,
    pendingCount: queue.length,
  };
}

// IndexedDB helpers
const DB_NAME = 'offline-queue';
const STORE_NAME = 'submissions';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function storeOfflineItem<T extends { id: string }>(item: T): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.put(item);
}

async function removeOfflineItem(id: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);
}

async function clearOfflineItems(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.clear();
}

export default usePWA;
