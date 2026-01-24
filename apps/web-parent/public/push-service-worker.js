// Push notification service worker for web-parent
// This is a placeholder for development - real implementation needed for production

self.addEventListener('install', (event) => {
  console.log('[Push SW] Installing service worker');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Push SW] Activating service worker');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[Push SW] Push received:', event);
  
  let data = { title: 'AIVO', body: 'You have a new notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      ...data,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AIVO', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Push SW] Notification click received:', event);
  
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if a window is already open
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
