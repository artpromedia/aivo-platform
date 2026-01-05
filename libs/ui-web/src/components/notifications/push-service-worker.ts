/**
 * Web Push Service Worker
 *
 * This service worker handles push notifications for the web application.
 * It manages notification display, click handling, and background sync.
 */

/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-unsafe-assignment, no-undef */

declare const self: ServiceWorkerGlobalScope;

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: {
    notificationId?: string;
    actionUrl?: string;
    type?: string;
    [key: string]: unknown;
  };
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  renotify?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_ICON = '/icons/notification-icon.png';
const DEFAULT_BADGE = '/icons/notification-badge.png';

// Cache name for notification assets
const NOTIFICATION_CACHE = 'notification-assets-v1';

// ══════════════════════════════════════════════════════════════════════════════
// INSTALLATION & ACTIVATION
// ══════════════════════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log('[Push SW] Installing service worker...');

  // Skip waiting and activate immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[Push SW] Activating service worker...');

  // Claim all clients
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('notification-') && name !== NOTIFICATION_CACHE)
            .map((name) => caches.delete(name))
        );
      }),
    ])
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// PUSH EVENT HANDLING
// ══════════════════════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  console.log('[Push SW] Push event received');

  if (!event.data) {
    console.warn('[Push SW] Push event has no data');
    return;
  }

  let payload: PushNotificationPayload;

  try {
    payload = event.data.json() as PushNotificationPayload;
  } catch {
    // If not JSON, treat as plain text
    console.debug('[Push SW] Treating push data as plain text');
    payload = {
      title: 'New Notification',
      body: event.data.text(),
    };
  }

  const { title, body, ...options } = payload;

  // Build notification options
  // Note: Some properties (actions, vibrate, renotify) are part of experimental APIs
  type ExtendedNotificationOptions = NotificationOptions & {
    image?: string;
    actions?: Array<{ action: string; title: string; icon?: string }>;
    vibrate?: number | number[];
    renotify?: boolean;
  };

  const notificationOptions: ExtendedNotificationOptions = {
    body,
    icon: options.icon ?? DEFAULT_ICON,
    badge: options.badge ?? DEFAULT_BADGE,
    image: options.image,
    tag: options.tag,
    data: options.data || {},
    actions: options.actions || [],
    requireInteraction: options.requireInteraction ?? false,
    silent: options.silent ?? false,
    vibrate: options.vibrate,
    renotify: options.renotify ?? false,
  };

  // Show notification
  event.waitUntil(
    Promise.all([
      // Show the notification
      self.registration.showNotification(title, notificationOptions),

      // Optional: Cache notification icon/image
      cacheNotificationAssets(options.icon, options.image),

      // Optional: Send analytics event
      trackNotificationReceived(options.data?.notificationId),
    ])
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CLICK HANDLING
// ══════════════════════════════════════════════════════════════════════════════

self.addEventListener('notificationclick', (event) => {
  console.log('[Push SW] Notification click event');

  const notification = event.notification;
  const data = notification.data as PushNotificationPayload['data'];
  const action = event.action;

  // Close the notification
  notification.close();

  // Handle specific actions
  let url = data?.actionUrl || '/';

  if (action) {
    // Handle custom action buttons
    switch (action) {
      case 'view':
        url = data?.actionUrl || '/notifications';
        break;
      case 'dismiss':
        // Just close, tracked below
        return;
      case 'reply':
        url = data?.actionUrl || '/messages';
        break;
      default:
        // Unknown action, use default URL
        break;
    }
  }

  // Track click
  event.waitUntil(
    Promise.all([
      // Track the notification click
      trackNotificationClicked(data?.notificationId, action),

      // Focus or open window
      focusOrOpenWindow(url),
    ])
  );
});

// Handle notification close (dismissed without clicking)
self.addEventListener('notificationclose', (event) => {
  console.log('[Push SW] Notification closed');

  const data = event.notification.data as PushNotificationPayload['data'];

  event.waitUntil(
    trackNotificationDismissed(data?.notificationId)
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Focus existing window or open new one
 */
async function focusOrOpenWindow(url: string): Promise<Client | null> {
  const urlToOpen = new URL(url, self.location.origin);

  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Try to find an existing window to focus
  for (const client of windowClients) {
    const clientUrl = new URL(client.url);

    // Check if there's a window with the same origin
    if (clientUrl.origin === urlToOpen.origin) {
      // Navigate to the new URL and focus
      if ('focus' in client) {
        await (client as WindowClient).focus();
      }
      if ('navigate' in client) {
        return (client as WindowClient).navigate(urlToOpen.href);
      }
      return client;
    }
  }

  // No existing window, open a new one
  return self.clients.openWindow(urlToOpen.href);
}

/**
 * Cache notification assets for offline display
 */
async function cacheNotificationAssets(icon?: string, image?: string): Promise<void> {
  const urls = [icon, image].filter((url): url is string => !!url);

  if (urls.length === 0) return;

  try {
    const cache = await caches.open(NOTIFICATION_CACHE);

    await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch {
          console.warn(`[Push SW] Failed to cache asset: ${url}`);
        }
      })
    );
  } catch {
    console.warn('[Push SW] Failed to open notification cache');
  }
}

/**
 * Track notification received (analytics)
 */
async function trackNotificationReceived(notificationId?: string): Promise<void> {
  if (!notificationId) return;

  try {
    // Use sendBeacon if available for reliability
    const url = `/api/notifications/track/received`;
    const data = JSON.stringify({ notificationId });

    navigator.sendBeacon(url, data);
  } catch {
    console.warn('[Push SW] Failed to track notification received');
  }
}

/**
 * Track notification clicked (analytics)
 */
async function trackNotificationClicked(notificationId?: string, action?: string): Promise<void> {
  if (!notificationId) return;

  try {
    const url = `/api/notifications/track/clicked`;
    const data = JSON.stringify({ notificationId, action });

    navigator.sendBeacon(url, data);
  } catch {
    console.warn('[Push SW] Failed to track notification clicked');
  }
}

/**
 * Track notification dismissed (analytics)
 */
async function trackNotificationDismissed(notificationId?: string): Promise<void> {
  if (!notificationId) return;

  try {
    const url = `/api/notifications/track/dismissed`;
    const data = JSON.stringify({ notificationId });

    navigator.sendBeacon(url, data);
  } catch {
    console.warn('[Push SW] Failed to track notification dismissed');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLING (FROM APP)
// ══════════════════════════════════════════════════════════════════════════════

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'SHOW_NOTIFICATION':
      // Allow the app to show a notification via the service worker
      if (payload?.title) {
        self.registration.showNotification(payload.title, payload.options);
      }
      break;

    case 'CLEAR_NOTIFICATIONS':
      // Clear all notifications with a specific tag
      self.registration.getNotifications({ tag: payload?.tag }).then((notifications) => {
        notifications.forEach((notification) => notification.close());
      });
      break;

    case 'GET_SUBSCRIPTION':
      // Return current push subscription
      self.registration.pushManager.getSubscription().then((subscription) => {
        if (event.ports?.[0]) {
          event.ports[0].postMessage({
            type: 'SUBSCRIPTION',
            subscription: subscription?.toJSON() ?? null,
          });
        }
      });
      break;

    default:
      console.log('[Push SW] Unknown message type:', type);
  }
});

// Export for TypeScript
export {};
