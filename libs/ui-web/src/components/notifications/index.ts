/**
 * Notification Components - Index
 *
 * Re-exports notification-related components and utilities.
 * Note: Notification type is exported from NotificationCenter (UI) and api-client (API).
 * We export from NotificationCenter to avoid duplicate exports.
 */

// Core notification components
export { NotificationCenter, type NotificationCenterProps, type Notification } from './NotificationCenter';
export { NotificationItem, type NotificationItemProps } from './NotificationItem';
export * from './NotificationFilters';
export * from './NotificationBadge';
export * from './NotificationPreferences';

// Web Push (RE-AUDIT-005)
export {
  WebPushManager,
  arrayBufferToBase64,
  useWebPush,
  type PushSubscriptionData,
  type WebPushManagerOptions,
  type UseWebPushOptions,
  type UseWebPushResult,
} from './web-push-manager';
export * from './WebPushProvider';

// API Client - exclude Notification type to avoid duplicate export
export {
  NotificationApiClient,
  type NotificationPreferences,
  type PaginatedResponse,
  type NotificationFilters as ApiNotificationFilters,
} from './api-client';
