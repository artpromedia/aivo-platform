/**
 * Marketplace Domain Events
 *
 * Event schemas for the content marketplace domain.
 * Used for:
 * - Analytics and warehouse ingestion
 * - Cross-service notifications (billing, content, AI orchestrator)
 * - Audit trail
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// BASE EVENT SCHEMA
// ══════════════════════════════════════════════════════════════════════════════

export const MarketplaceEventBase = z.object({
  id: z.string().uuid(),
  occurredAt: z.string().datetime(),
  source: z.literal('marketplace-svc'),
});

// ══════════════════════════════════════════════════════════════════════════════
// VENDOR EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export const VendorApprovedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.vendor.approved'),
  data: z.object({
    vendorId: z.string().uuid(),
    vendorSlug: z.string(),
    vendorName: z.string(),
    vendorType: z.enum(['AIVO', 'THIRD_PARTY']),
    approvedByUserId: z.string().uuid(),
  }),
});

export const VendorSuspendedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.vendor.suspended'),
  data: z.object({
    vendorId: z.string().uuid(),
    vendorSlug: z.string(),
    reason: z.string().optional(),
    suspendedByUserId: z.string().uuid(),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT PACK / ITEM EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export const PackPublishedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.pack.published'),
  data: z.object({
    marketplaceItemId: z.string().uuid(),
    marketplaceItemSlug: z.string(),
    versionId: z.string().uuid(),
    version: z.string(),
    vendorId: z.string().uuid(),
    vendorSlug: z.string(),
    itemType: z.enum(['CONTENT_PACK', 'EMBEDDED_TOOL']),
    subjects: z.array(z.string()),
    gradeBands: z.array(z.string()),
    safetyRating: z.string(),
    publishedByUserId: z.string().uuid(),
  }),
});

export const PackDeprecatedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.pack.deprecated'),
  data: z.object({
    marketplaceItemId: z.string().uuid(),
    marketplaceItemSlug: z.string(),
    versionId: z.string().uuid(),
    version: z.string(),
    reason: z.string().optional(),
    deprecatedByUserId: z.string().uuid(),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════
// LICENSE EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export const LicenseCreatedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.license.created'),
  data: z.object({
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    marketplaceItemSlug: z.string(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELED']),
    scopeType: z.enum(['TENANT', 'SCHOOL', 'GRADE_BAND', 'CLASSROOM']),
    seatLimit: z.number().nullable(),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime().nullable(),
    licenseType: z.enum(['B2B_CONTRACT', 'B2B_SUBSCRIPTION', 'D2C_PARENT']),
    purchaserParentUserId: z.string().uuid().nullable(),
    billingSubscriptionId: z.string().uuid().nullable(),
    billingContractLineId: z.string().uuid().nullable(),
    createdByUserId: z.string().uuid().nullable(),
  }),
});

export const LicenseActivatedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.license.activated'),
  data: z.object({
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    previousStatus: z.enum(['PENDING', 'SUSPENDED']),
    activatedByUserId: z.string().uuid().nullable(),
    activationSource: z.enum(['billing_webhook', 'admin_action', 'auto_activation']),
  }),
});

export const LicenseSuspendedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.license.suspended'),
  data: z.object({
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    reason: z.string(),
    suspendedByUserId: z.string().uuid().nullable(),
    suspensionSource: z.enum(['billing_webhook', 'admin_action', 'policy_violation']),
  }),
});

export const LicenseExpiredEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.license.expired'),
  data: z.object({
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    expiredAt: z.string().datetime(),
  }),
});

export const LicenseCanceledEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.license.canceled'),
  data: z.object({
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    reason: z.string().optional(),
    canceledByUserId: z.string().uuid().nullable(),
    cancellationSource: z.enum(['billing_webhook', 'admin_action', 'tenant_request']),
  }),
});

export const LicenseRenewedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.license.renewed'),
  data: z.object({
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    previousValidUntil: z.string().datetime().nullable(),
    newValidUntil: z.string().datetime().nullable(),
    renewedByUserId: z.string().uuid().nullable(),
    renewalSource: z.enum(['billing_webhook', 'admin_action', 'auto_renewal']),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════
// ENTITLEMENT EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export const EntitlementAssignedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.entitlement.assigned'),
  data: z.object({
    entitlementId: z.string().uuid(),
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    loId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    allowedGradeBands: z.array(z.string()),
    allowedSchoolIds: z.array(z.string().uuid()),
    assignedByUserId: z.string().uuid().nullable(),
  }),
});

export const EntitlementRevokedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.entitlement.revoked'),
  data: z.object({
    entitlementId: z.string().uuid(),
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    loId: z.string().uuid(),
    reason: z.string(),
    revokedByUserId: z.string().uuid().nullable(),
    revocationSource: z.enum(['license_expired', 'license_canceled', 'admin_action', 'scope_changed']),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════
// SEAT ASSIGNMENT EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export const SeatAssignedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.seat.assigned'),
  data: z.object({
    seatAssignmentId: z.string().uuid(),
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    learnerId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    schoolId: z.string().uuid().nullable(),
    classroomId: z.string().uuid().nullable(),
    seatsUsedAfter: z.number(),
    seatLimit: z.number().nullable(),
    assignedByUserId: z.string().uuid(),
  }),
});

export const SeatReleasedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.seat.released'),
  data: z.object({
    seatAssignmentId: z.string().uuid(),
    licenseId: z.string().uuid(),
    tenantId: z.string().uuid(),
    learnerId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    seatsUsedAfter: z.number(),
    releaseReason: z.string(),
    releasedByUserId: z.string().uuid().nullable(),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════
// USAGE EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export const PartnerContentUsageEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.pack.usage'),
  data: z.object({
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    vendorId: z.string().uuid(),
    loId: z.string().uuid(),
    learnerId: z.string().uuid(),
    sessionId: z.string().uuid(),
    schoolId: z.string().uuid().nullable(),
    classroomId: z.string().uuid().nullable(),
    subject: z.string(),
    gradeBand: z.string(),
    durationSeconds: z.number(),
    completedAt: z.string().datetime(),
  }),
});

export const EntitlementCheckFailedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.entitlement.check_failed'),
  data: z.object({
    tenantId: z.string().uuid(),
    loId: z.string().uuid().nullable(),
    marketplaceItemId: z.string().uuid().nullable(),
    learnerId: z.string().uuid().nullable(),
    schoolId: z.string().uuid().nullable(),
    classroomId: z.string().uuid().nullable(),
    failureReason: z.enum([
      'NO_LICENSE',
      'LICENSE_EXPIRED',
      'LICENSE_SUSPENDED',
      'SCOPE_MISMATCH',
      'SEAT_LIMIT_EXCEEDED',
      'LEARNER_NOT_COVERED',
    ]),
    requestedByService: z.string(),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════
// INSTALLATION EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export const InstallationCreatedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.installation.created'),
  data: z.object({
    installationId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    marketplaceItemSlug: z.string(),
    versionId: z.string().uuid(),
    schoolId: z.string().uuid().nullable(),
    classroomId: z.string().uuid().nullable(),
    status: z.enum(['PENDING_APPROVAL', 'ACTIVE', 'DISABLED', 'REVOKED']),
    installedByUserId: z.string().uuid(),
  }),
});

export const InstallationApprovedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.installation.approved'),
  data: z.object({
    installationId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    approvedByUserId: z.string().uuid(),
    approvalNotes: z.string().nullable(),
  }),
});

export const InstallationRevokedEvent = MarketplaceEventBase.extend({
  eventType: z.literal('marketplace.installation.revoked'),
  data: z.object({
    installationId: z.string().uuid(),
    tenantId: z.string().uuid(),
    marketplaceItemId: z.string().uuid(),
    reason: z.string(),
    revokedByUserId: z.string().uuid(),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════
// UNION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const MarketplaceEvent = z.discriminatedUnion('eventType', [
  VendorApprovedEvent,
  VendorSuspendedEvent,
  PackPublishedEvent,
  PackDeprecatedEvent,
  LicenseCreatedEvent,
  LicenseActivatedEvent,
  LicenseSuspendedEvent,
  LicenseExpiredEvent,
  LicenseCanceledEvent,
  LicenseRenewedEvent,
  EntitlementAssignedEvent,
  EntitlementRevokedEvent,
  SeatAssignedEvent,
  SeatReleasedEvent,
  PartnerContentUsageEvent,
  EntitlementCheckFailedEvent,
  InstallationCreatedEvent,
  InstallationApprovedEvent,
  InstallationRevokedEvent,
]);

// ══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS (inferred from Zod schemas)
// ══════════════════════════════════════════════════════════════════════════════

export type VendorApprovedEventType = z.infer<typeof VendorApprovedEvent>;
export type VendorSuspendedEventType = z.infer<typeof VendorSuspendedEvent>;
export type PackPublishedEventType = z.infer<typeof PackPublishedEvent>;
export type PackDeprecatedEventType = z.infer<typeof PackDeprecatedEvent>;
export type LicenseCreatedEventType = z.infer<typeof LicenseCreatedEvent>;
export type LicenseActivatedEventType = z.infer<typeof LicenseActivatedEvent>;
export type LicenseSuspendedEventType = z.infer<typeof LicenseSuspendedEvent>;
export type LicenseExpiredEventType = z.infer<typeof LicenseExpiredEvent>;
export type LicenseCanceledEventType = z.infer<typeof LicenseCanceledEvent>;
export type LicenseRenewedEventType = z.infer<typeof LicenseRenewedEvent>;
export type EntitlementAssignedEventType = z.infer<typeof EntitlementAssignedEvent>;
export type EntitlementRevokedEventType = z.infer<typeof EntitlementRevokedEvent>;
export type SeatAssignedEventType = z.infer<typeof SeatAssignedEvent>;
export type SeatReleasedEventType = z.infer<typeof SeatReleasedEvent>;
export type PartnerContentUsageEventType = z.infer<typeof PartnerContentUsageEvent>;
export type EntitlementCheckFailedEventType = z.infer<typeof EntitlementCheckFailedEvent>;
export type InstallationCreatedEventType = z.infer<typeof InstallationCreatedEvent>;
export type InstallationApprovedEventType = z.infer<typeof InstallationApprovedEvent>;
export type InstallationRevokedEventType = z.infer<typeof InstallationRevokedEvent>;
export type MarketplaceEventType = z.infer<typeof MarketplaceEvent>;

// ══════════════════════════════════════════════════════════════════════════════
// NATS SUBJECTS
// ══════════════════════════════════════════════════════════════════════════════

export const MARKETPLACE_SUBJECTS = {
  // Vendor lifecycle
  VENDOR_APPROVED: 'marketplace.vendor.approved',
  VENDOR_SUSPENDED: 'marketplace.vendor.suspended',

  // Content pack lifecycle
  PACK_PUBLISHED: 'marketplace.pack.published',
  PACK_DEPRECATED: 'marketplace.pack.deprecated',

  // License lifecycle
  LICENSE_CREATED: 'marketplace.license.created',
  LICENSE_ACTIVATED: 'marketplace.license.activated',
  LICENSE_SUSPENDED: 'marketplace.license.suspended',
  LICENSE_EXPIRED: 'marketplace.license.expired',
  LICENSE_CANCELED: 'marketplace.license.canceled',
  LICENSE_RENEWED: 'marketplace.license.renewed',

  // Entitlements
  ENTITLEMENT_ASSIGNED: 'marketplace.entitlement.assigned',
  ENTITLEMENT_REVOKED: 'marketplace.entitlement.revoked',

  // Seats
  SEAT_ASSIGNED: 'marketplace.seat.assigned',
  SEAT_RELEASED: 'marketplace.seat.released',

  // Usage & metrics
  PACK_USAGE: 'marketplace.pack.usage',
  ENTITLEMENT_CHECK_FAILED: 'marketplace.entitlement.check_failed',

  // Installations
  INSTALLATION_CREATED: 'marketplace.installation.created',
  INSTALLATION_APPROVED: 'marketplace.installation.approved',
  INSTALLATION_REVOKED: 'marketplace.installation.revoked',
} as const;
