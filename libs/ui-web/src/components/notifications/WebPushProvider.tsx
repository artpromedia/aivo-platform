/**
 * Web Push Provider
 *
 * React context provider for web push notifications.
 * Handles initialization, permission management, and subscription state.
 *
 * Addresses RE-AUDIT-005: Web Teacher/Parent Apps Lack Push Notifications
 */
'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useWebPush, type PushSubscriptionData } from './web-push-manager';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface WebPushContextValue {
  /** Whether push notifications are supported by the browser */
  isSupported: boolean;
  /** Current notification permission state */
  permission: NotificationPermission;
  /** Whether the user is currently subscribed to push notifications */
  isSubscribed: boolean;
  /** Current push subscription data (null if not subscribed) */
  subscription: PushSubscriptionData | null;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error encountered */
  error: Error | null;
  /** Request permission to send notifications */
  requestPermission: () => Promise<NotificationPermission>;
  /** Subscribe to push notifications */
  subscribe: () => Promise<void>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<void>;
  /** Show a local notification */
  showNotification: (title: string, options?: NotificationOptions) => Promise<void>;
}

export interface WebPushProviderProps {
  children: ReactNode;
  /** VAPID public key for web push */
  vapidPublicKey: string;
  /** Path to the service worker file */
  serviceWorkerPath?: string;
  /** Callback when subscription changes */
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
  /** API endpoint to register push subscription with server */
  registerEndpoint?: string;
  /** API endpoint to unregister push subscription */
  unregisterEndpoint?: string;
  /** User role for identifying the subscription */
  userRole?: 'teacher' | 'parent' | 'learner' | 'admin';
  /** User ID for the subscription */
  userId?: string;
  /** Tenant ID for multi-tenant scenarios */
  tenantId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

const WebPushContext = createContext<WebPushContextValue | null>(null);

export function useWebPushContext(): WebPushContextValue {
  const context = useContext(WebPushContext);
  if (!context) {
    throw new Error('useWebPushContext must be used within a WebPushProvider');
  }
  return context;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

export function WebPushProvider({
  children,
  vapidPublicKey,
  serviceWorkerPath = '/push-service-worker.js',
  onSubscriptionChange,
  registerEndpoint = '/api/notifications/push/subscribe',
  unregisterEndpoint = '/api/notifications/push/unsubscribe',
  userRole,
  userId,
  tenantId,
}: WebPushProviderProps) {
  const [registrationError, setRegistrationError] = useState<Error | null>(null);

  const {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    isLoading,
    error: hookError,
    requestPermission: requestPermissionBase,
    subscribe: subscribeBase,
    unsubscribe: unsubscribeBase,
  } = useWebPush({
    vapidPublicKey,
    serviceWorkerPath,
    onSubscriptionChange,
    autoInitialize: true,
  });

  // Register subscription with server
  const registerWithServer = useCallback(
    async (subscriptionData: PushSubscriptionData) => {
      if (!registerEndpoint) return;

      try {
        const response = await fetch(registerEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            subscription: subscriptionData,
            userRole,
            userId,
            tenantId,
            userAgent: navigator.userAgent,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to register push subscription with server');
        }

        console.log('[WebPushProvider] Subscription registered with server');
      } catch (err) {
        console.error('[WebPushProvider] Failed to register with server:', err);
        setRegistrationError(
          err instanceof Error ? err : new Error('Registration failed')
        );
      }
    },
    [registerEndpoint, userRole, userId, tenantId]
  );

  // Unregister subscription from server
  const unregisterFromServer = useCallback(
    async (endpoint: string) => {
      if (!unregisterEndpoint) return;

      try {
        const response = await fetch(unregisterEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            endpoint,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to unregister push subscription from server');
        }

        console.log('[WebPushProvider] Subscription unregistered from server');
      } catch (err) {
        console.error('[WebPushProvider] Failed to unregister from server:', err);
      }
    },
    [unregisterEndpoint, userId]
  );

  // Enhanced subscribe that also registers with server
  const subscribe = useCallback(async () => {
    const data = await subscribeBase();
    if (data) {
      await registerWithServer(data);
    }
  }, [subscribeBase, registerWithServer]);

  // Enhanced unsubscribe that also unregisters from server
  const unsubscribe = useCallback(async () => {
    const currentEndpoint = subscription?.endpoint;
    const success = await unsubscribeBase();
    if (success && currentEndpoint) {
      await unregisterFromServer(currentEndpoint);
    }
  }, [unsubscribeBase, unregisterFromServer, subscription?.endpoint]);

  // Show local notification helper
  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      // Use service worker for better reliability
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
    },
    [permission]
  );

  const error = hookError || registrationError;

  const value: WebPushContextValue = {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    isLoading,
    error,
    requestPermission: requestPermissionBase,
    subscribe,
    unsubscribe,
    showNotification,
  };

  return (
    <WebPushContext.Provider value={value}>{children}</WebPushContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

export interface PushNotificationBannerProps {
  /** Title text for the banner */
  title?: string;
  /** Description text */
  description?: string;
  /** Text for the enable button */
  enableText?: string;
  /** Text for the dismiss button */
  dismissText?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Banner component to prompt users to enable push notifications
 */
export function PushNotificationBanner({
  title = 'Stay Updated',
  description = 'Enable push notifications to receive real-time updates about your students.',
  enableText = 'Enable Notifications',
  dismissText = 'Not Now',
  onDismiss,
  className = '',
}: PushNotificationBannerProps) {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } =
    useWebPushContext();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not supported, already subscribed, or dismissed
  if (!isSupported || isSubscribed || permission === 'denied' || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`rounded-lg border border-primary/20 bg-primary/5 p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => subscribe()}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              {isLoading ? 'Enabling...' : enableText}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {dismissText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PushNotificationToggleProps {
  /** Label text */
  label?: string;
  /** Description text */
  description?: string;
  /** Custom class name */
  className?: string;
}

/**
 * Toggle component for enabling/disabling push notifications
 */
export function PushNotificationToggle({
  label = 'Push Notifications',
  description = 'Receive notifications even when the app is closed',
  className = '',
}: PushNotificationToggleProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission,
  } = useWebPushContext();

  if (!isSupported) {
    return (
      <div className={`opacity-50 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">
              Push notifications are not supported in this browser
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      if (permission === 'default') {
        await requestPermission();
      }
      if (permission !== 'denied') {
        await subscribe();
      }
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {permission === 'denied'
              ? 'Notifications blocked. Enable in browser settings.'
              : description}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isSubscribed}
          disabled={isLoading || permission === 'denied'}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            isSubscribed ? 'bg-primary' : 'bg-gray-200'
          }`}
        >
          <span className="sr-only">Toggle push notifications</span>
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isSubscribed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
