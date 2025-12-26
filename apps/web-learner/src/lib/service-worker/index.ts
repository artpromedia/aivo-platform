/**
 * Service Worker Registration
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    // Check for updates immediately
    registration.update();

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Every hour

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New version available
          dispatchEvent(
            new CustomEvent('sw-update-available', {
              detail: { registration },
            })
          );
        }
      });
    });

    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export function skipWaiting(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
}

export async function getCacheStatus(): Promise<Record<string, number>> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data);
    navigator.serviceWorker.controller?.postMessage(
      { type: 'GET_CACHE_STATUS' },
      [channel.port2]
    );
  });
}

export async function clearCache(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' }, [
      channel.port2,
    ]);
  });
}

export function precacheRoute(url: string): void {
  navigator.serviceWorker.controller?.postMessage({
    type: 'PRECACHE_ROUTE',
    url,
  });
}

// Queue offline submissions
export async function queueSubmission(submission: any): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('submissions', 'readwrite');
    const store = transaction.objectStore('submissions');
    const request = store.add({
      ...submission,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Request background sync
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          (registration as any).sync.register('sync-submissions');
        });
      }
      resolve();
    };
  });
}

// Queue progress updates
export async function queueProgress(progress: any): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('progress', 'readwrite');
    const store = transaction.objectStore('progress');
    const request = store.add({
      ...progress,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          (registration as any).sync.register('sync-progress');
        });
      }
      resolve();
    };
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('offline-queue', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('submissions')) {
        db.createObjectStore('submissions', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'id' });
      }
    };
  });
}
