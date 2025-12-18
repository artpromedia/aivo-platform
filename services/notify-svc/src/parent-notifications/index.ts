/**
 * ND-3.1: Parent Notifications Module
 *
 * Exports for parent notification system.
 */

// Types
export * from './parent-notification.types.js';

// Services
export { UrgencyClassifier } from './urgency-classifier.js';
export { NotificationPreferencesService } from './notification-preferences.service.js';
export { NotificationAggregator } from './notification-aggregator.js';
export { NotificationScheduler } from './notification-scheduler.js';
export { ParentNotificationService } from './parent-notification.service.js';

// Channels
export {
  PushChannel,
  EmailChannel,
  SMSChannel,
  InAppChannel,
  ChannelManager,
} from './notification-channels.js';

// Templates
export { NotificationTemplates, generateDailyDigestTemplate } from './notification-templates.js';

// Routes
export { registerParentNotificationRoutes } from './parent-notification.routes.js';
