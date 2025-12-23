/**
 * Marketplace Events Module
 *
 * Exports both publishing and subscribing capabilities for event-driven architecture.
 */

// Outbound events - publishing license and entitlement lifecycle events
export {
  publishLicenseCreated,
  publishLicenseActivated,
  publishLicenseSuspended,
  publishLicenseExpired,
  publishLicenseCanceled,
  publishEntitlementChanged,
  publishSeatAssigned,
  publishSeatUnassigned,
  type LicenseCreatedPayload,
  type LicenseActivatedPayload,
  type LicenseSuspendedPayload,
  type LicenseExpiredPayload,
  type LicenseCanceledPayload,
  type EntitlementChangedPayload,
  type SeatAssignedPayload,
  type SeatUnassignedPayload,
} from './publisher';

// Inbound events - subscribing to external service events
export {
  MarketplaceEventSubscriber,
  createMarketplaceSubscriber,
  registerDefaultHandlers,
  type SubscriberConfig,
  type BillingSubscriptionEvent,
  type BillingPaymentEvent,
  type ContentPublishedEvent,
  type ContentArchivedEvent,
  type TenantCreatedEvent,
  type TenantSuspendedEvent,
  type UsageAnalyticsEvent,
} from './subscriber';
