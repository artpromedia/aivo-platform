/**
 * Web Push Subscription Manager
 *
 * Handles web push subscription, registration, and permission management.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime: number | null;
}

export interface WebPushManagerOptions {
  vapidPublicKey: string;
  serviceWorkerPath?: string;
  onPermissionChange?: (permission: NotificationPermission) => void;
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Convert URL-safe base64 to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// ══════════════════════════════════════════════════════════════════════════════
// WEB PUSH MANAGER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Web Push Manager Class
 *
 * Manages web push notifications:
 * - Service worker registration
 * - Permission requests
 * - Push subscription management
 */
export class WebPushManager {
  private vapidPublicKey: Uint8Array;
  private serviceWorkerPath: string;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private onPermissionChange?: (permission: NotificationPermission) => void;
  private onSubscriptionChange?: (subscription: PushSubscription | null) => void;

  constructor(options: WebPushManagerOptions) {
    this.vapidPublicKey = urlBase64ToUint8Array(options.vapidPublicKey);
    this.serviceWorkerPath = options.serviceWorkerPath || '/push-service-worker.js';
    this.onPermissionChange = options.onPermissionChange;
    this.onSubscriptionChange = options.onSubscriptionChange;
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    this.onPermissionChange?.(permission);
    return permission;
  }

  /**
   * Initialize the push manager
   * Registers service worker and checks for existing subscription
   */
  async initialize(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('[WebPushManager] Push notifications not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register(
        this.serviceWorkerPath,
        { scope: '/' }
      );

      console.log('[WebPushManager] Service worker registered');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();
      this.onSubscriptionChange?.(this.subscription);

      if (this.subscription) {
        console.log('[WebPushManager] Existing push subscription found');
      }
    } catch (error) {
      console.error('[WebPushManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscriptionData | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered. Call initialize() first.');
    }

    // Check permission
    const permission = this.getPermission();
    if (permission !== 'granted') {
      const newPermission = await this.requestPermission();
      if (newPermission !== 'granted') {
        console.log('[WebPushManager] Permission not granted');
        return null;
      }
    }

    try {
      // Unsubscribe from any existing subscription
      if (this.subscription) {
        await this.subscription.unsubscribe();
      }

      // Create new subscription
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.vapidPublicKey,
      });

      console.log('[WebPushManager] Successfully subscribed to push notifications');
      this.onSubscriptionChange?.(this.subscription);

      return this.getSubscriptionData();
    } catch (error) {
      console.error('[WebPushManager] Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      console.log('[WebPushManager] No subscription to unsubscribe');
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();
      if (success) {
        this.subscription = null;
        this.onSubscriptionChange?.(null);
        console.log('[WebPushManager] Successfully unsubscribed');
      }
      return success;
    } catch (error) {
      console.error('[WebPushManager] Failed to unsubscribe:', error);
      throw error;
    }
  }

  /**
   * Get current subscription data in a format suitable for the server
   */
  getSubscriptionData(): PushSubscriptionData | null {
    if (!this.subscription) {
      return null;
    }

    const json = this.subscription.toJSON();
    const keys = json.keys as Record<string, string> | undefined;

    return {
      endpoint: this.subscription.endpoint,
      keys: {
        p256dh: keys?.p256dh || '',
        auth: keys?.auth || '',
      },
      expirationTime: this.subscription.expirationTime,
    };
  }

  /**
   * Check if currently subscribed
   */
  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  /**
   * Send a message to the service worker
   */
  async sendMessage(message: unknown): Promise<unknown> {
    if (!this.registration?.active) {
      throw new Error('No active service worker');
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Show a local notification (not a push notification)
   */
  async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if (!this.registration) {
      throw new Error('Service worker not registered');
    }

    if (this.getPermission() !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    await this.registration.showNotification(title, options);
  }

  /**
   * Close all notifications with a specific tag
   */
  async closeNotifications(tag?: string): Promise<void> {
    if (!this.registration) {
      return;
    }

    const notifications = await this.registration.getNotifications({ tag });
    notifications.forEach((notification) => notification.close());
  }

  /**
   * Update service worker
   */
  async update(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REACT HOOK
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseWebPushOptions {
  vapidPublicKey: string;
  serviceWorkerPath?: string;
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
  autoInitialize?: boolean;
}

export interface UseWebPushResult {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscriptionData | null;
  isLoading: boolean;
  error: Error | null;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<PushSubscriptionData | null>;
  unsubscribe: () => Promise<boolean>;
}

/**
 * React hook for managing web push notifications
 */
export function useWebPush({
  vapidPublicKey,
  serviceWorkerPath,
  onSubscriptionChange,
  autoInitialize = true,
}: UseWebPushOptions): UseWebPushResult {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const managerRef = useRef<WebPushManager | null>(null);

  // Initialize manager
  useEffect(() => {
    const manager = new WebPushManager({
      vapidPublicKey,
      serviceWorkerPath,
      onPermissionChange: setPermission,
      onSubscriptionChange: (sub) => {
        setIsSubscribed(!!sub);
        onSubscriptionChange?.(sub);
      },
    });

    managerRef.current = manager;
    setIsSupported(manager.isSupported());
    setPermission(manager.getPermission());

    if (autoInitialize && manager.isSupported()) {
      manager
        .initialize()
        .then(() => {
          setSubscription(manager.getSubscriptionData());
          setIsSubscribed(manager.isSubscribed());
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error('Failed to initialize'));
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [vapidPublicKey, serviceWorkerPath, onSubscriptionChange, autoInitialize]);

  const requestPermission = useCallback(async () => {
    if (!managerRef.current) {
      throw new Error('Manager not initialized');
    }
    return managerRef.current.requestPermission();
  }, []);

  const subscribe = useCallback(async () => {
    if (!managerRef.current) {
      throw new Error('Manager not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await managerRef.current.subscribe();
      setSubscription(data);
      setIsSubscribed(!!data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!managerRef.current) {
      throw new Error('Manager not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await managerRef.current.unsubscribe();
      if (success) {
        setSubscription(null);
        setIsSubscribed(false);
      }
      return success;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unsubscribe');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
