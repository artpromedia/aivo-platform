/**
 * Marketplace Event Publisher
 *
 * NATS JetStream integration for marketplace domain events.
 * Publishes events for:
 * - License lifecycle (created, activated, suspended, expired, canceled, renewed)
 * - Entitlement changes (assigned, revoked)
 * - Seat assignments (assigned, released)
 * - Content usage tracking
 * - Installation lifecycle
 */

import { randomUUID } from 'node:crypto';

import type {
  LicenseStatus,
  MarketplaceGradeBand,
} from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MarketplaceEventBase {
  id: string;
  occurredAt: string;
  source: 'marketplace-svc';
}

export interface LicenseCreatedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.license.created';
  data: {
    licenseId: string;
    tenantId: string;
    marketplaceItemId: string;
    marketplaceItemSlug: string;
    status: LicenseStatus;
    scopeType: string;
    seatLimit: number | null;
    validFrom: string;
    validUntil: string | null;
    licenseType: 'B2B_CONTRACT' | 'B2B_SUBSCRIPTION' | 'D2C_PARENT';
    purchaserParentUserId: string | null;
    billingSubscriptionId: string | null;
    billingContractLineId: string | null;
    createdByUserId: string | null;
  };
}

export interface LicenseActivatedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.license.activated';
  data: {
    licenseId: string;
    tenantId: string;
    marketplaceItemId: string;
    previousStatus: 'PENDING' | 'SUSPENDED';
    activatedByUserId: string | null;
    activationSource: 'billing_webhook' | 'admin_action' | 'auto_activation';
  };
}

export interface LicenseSuspendedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.license.suspended';
  data: {
    licenseId: string;
    tenantId: string;
    marketplaceItemId: string;
    reason: string;
    suspendedByUserId: string | null;
    suspensionSource: 'billing_webhook' | 'admin_action' | 'policy_violation';
  };
}

export interface LicenseExpiredPayload extends MarketplaceEventBase {
  eventType: 'marketplace.license.expired';
  data: {
    licenseId: string;
    tenantId: string;
    marketplaceItemId: string;
    expiredAt: string;
  };
}

export interface LicenseCanceledPayload extends MarketplaceEventBase {
  eventType: 'marketplace.license.canceled';
  data: {
    licenseId: string;
    tenantId: string;
    marketplaceItemId: string;
    reason?: string;
    canceledByUserId: string | null;
    cancellationSource: 'billing_webhook' | 'admin_action' | 'tenant_request';
  };
}

export interface EntitlementAssignedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.entitlement.assigned';
  data: {
    entitlementId: string;
    licenseId: string;
    tenantId: string;
    loId: string;
    marketplaceItemId: string;
    allowedGradeBands: string[];
    allowedSchoolIds: string[];
    assignedByUserId: string | null;
  };
}

export interface EntitlementRevokedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.entitlement.revoked';
  data: {
    entitlementId: string;
    licenseId: string;
    tenantId: string;
    loId: string;
    reason: string;
    revokedByUserId: string | null;
    revocationSource: 'license_expired' | 'license_canceled' | 'admin_action' | 'scope_changed';
  };
}

export interface SeatAssignedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.seat.assigned';
  data: {
    seatAssignmentId: string;
    licenseId: string;
    tenantId: string;
    learnerId: string;
    marketplaceItemId: string;
    schoolId: string | null;
    classroomId: string | null;
    seatsUsedAfter: number;
    seatLimit: number | null;
    assignedByUserId: string;
  };
}

export interface SeatReleasedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.seat.released';
  data: {
    seatAssignmentId: string;
    licenseId: string;
    tenantId: string;
    learnerId: string;
    marketplaceItemId: string;
    seatsUsedAfter: number;
    releaseReason: string;
    releasedByUserId: string | null;
  };
}

export interface PartnerContentUsagePayload extends MarketplaceEventBase {
  eventType: 'marketplace.pack.usage';
  data: {
    tenantId: string;
    marketplaceItemId: string;
    vendorId: string;
    loId: string;
    learnerId: string;
    sessionId: string;
    schoolId: string | null;
    classroomId: string | null;
    subject: string;
    gradeBand: string;
    durationSeconds: number;
    completedAt: string;
  };
}

export interface EntitlementCheckFailedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.entitlement.check_failed';
  data: {
    tenantId: string;
    loId: string | null;
    marketplaceItemId: string | null;
    learnerId: string | null;
    schoolId: string | null;
    classroomId: string | null;
    failureReason:
      | 'NO_LICENSE'
      | 'LICENSE_EXPIRED'
      | 'LICENSE_SUSPENDED'
      | 'SCOPE_MISMATCH'
      | 'SEAT_LIMIT_EXCEEDED'
      | 'LEARNER_NOT_COVERED';
    requestedByService: string;
  };
}

export interface InstallationCreatedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.installation.created';
  data: {
    installationId: string;
    tenantId: string;
    marketplaceItemId: string;
    marketplaceItemSlug: string;
    versionId: string;
    schoolId: string | null;
    classroomId: string | null;
    status: string;
    installedByUserId: string;
  };
}

export interface InstallationApprovedPayload extends MarketplaceEventBase {
  eventType: 'marketplace.installation.approved';
  data: {
    installationId: string;
    tenantId: string;
    marketplaceItemId: string;
    approvedByUserId: string;
    approvalNotes: string | null;
  };
}

export type MarketplaceDomainEvent =
  | LicenseCreatedPayload
  | LicenseActivatedPayload
  | LicenseSuspendedPayload
  | LicenseExpiredPayload
  | LicenseCanceledPayload
  | EntitlementAssignedPayload
  | EntitlementRevokedPayload
  | SeatAssignedPayload
  | SeatReleasedPayload
  | PartnerContentUsagePayload
  | EntitlementCheckFailedPayload
  | InstallationCreatedPayload
  | InstallationApprovedPayload;

// ══════════════════════════════════════════════════════════════════════════════
// NATS PUBLISHER INTERFACE
// ══════════════════════════════════════════════════════════════════════════════

export interface NatsPublisher {
  publish(subject: string, payload: unknown): Promise<void>;
}

// In-memory placeholder for when NATS is not connected
let natsPublisher: NatsPublisher | null = null;

/**
 * Set the NATS publisher instance
 */
export function setNatsPublisher(publisher: NatsPublisher): void {
  natsPublisher = publisher;
}

/**
 * Get the configured NATS publisher
 */
export function getNatsPublisher(): NatsPublisher | null {
  return natsPublisher;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PUBLISHERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Publish a license created event
 */
export async function publishLicenseCreated(
  license: {
    id: string;
    tenantId: string;
    marketplaceItemId: string;
    status: LicenseStatus;
    scopeType: string;
    seatLimit: number | null;
    validFrom: Date;
    validUntil: Date | null;
    purchaserParentUserId: string | null;
    billingSubscriptionId: string | null;
    billingContractLineId: string | null;
    createdByUserId: string | null;
  },
  marketplaceItemSlug: string
): Promise<void> {
  // Determine license type
  let licenseType: 'B2B_CONTRACT' | 'B2B_SUBSCRIPTION' | 'D2C_PARENT';
  if (license.purchaserParentUserId) {
    licenseType = 'D2C_PARENT';
  } else if (license.billingContractLineId) {
    licenseType = 'B2B_CONTRACT';
  } else {
    licenseType = 'B2B_SUBSCRIPTION';
  }

  const payload: LicenseCreatedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.license.created',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      licenseId: license.id,
      tenantId: license.tenantId,
      marketplaceItemId: license.marketplaceItemId,
      marketplaceItemSlug,
      status: license.status,
      scopeType: license.scopeType,
      seatLimit: license.seatLimit,
      validFrom: license.validFrom.toISOString(),
      validUntil: license.validUntil?.toISOString() ?? null,
      licenseType,
      purchaserParentUserId: license.purchaserParentUserId,
      billingSubscriptionId: license.billingSubscriptionId,
      billingContractLineId: license.billingContractLineId,
      createdByUserId: license.createdByUserId,
    },
  };

  await publishToNats('marketplace.license.created', payload);
}

/**
 * Publish a license activated event
 */
export async function publishLicenseActivated(
  licenseId: string,
  tenantId: string,
  marketplaceItemId: string,
  previousStatus: 'PENDING' | 'SUSPENDED',
  activatedByUserId: string | null,
  activationSource: 'billing_webhook' | 'admin_action' | 'auto_activation'
): Promise<void> {
  const payload: LicenseActivatedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.license.activated',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      licenseId,
      tenantId,
      marketplaceItemId,
      previousStatus,
      activatedByUserId,
      activationSource,
    },
  };

  await publishToNats('marketplace.license.activated', payload);
}

/**
 * Publish a license suspended event
 */
export async function publishLicenseSuspended(
  licenseId: string,
  tenantId: string,
  marketplaceItemId: string,
  reason: string,
  suspendedByUserId: string | null,
  suspensionSource: 'billing_webhook' | 'admin_action' | 'policy_violation'
): Promise<void> {
  const payload: LicenseSuspendedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.license.suspended',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      licenseId,
      tenantId,
      marketplaceItemId,
      reason,
      suspendedByUserId,
      suspensionSource,
    },
  };

  await publishToNats('marketplace.license.suspended', payload);
}

/**
 * Publish a license expired event
 */
export async function publishLicenseExpired(
  licenseId: string,
  tenantId: string,
  marketplaceItemId: string
): Promise<void> {
  const payload: LicenseExpiredPayload = {
    id: randomUUID(),
    eventType: 'marketplace.license.expired',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      licenseId,
      tenantId,
      marketplaceItemId,
      expiredAt: new Date().toISOString(),
    },
  };

  await publishToNats('marketplace.license.expired', payload);
}

/**
 * Publish a license canceled event
 */
export async function publishLicenseCanceled(
  licenseId: string,
  tenantId: string,
  marketplaceItemId: string,
  canceledByUserId: string | null,
  cancellationSource: 'billing_webhook' | 'admin_action' | 'tenant_request',
  reason?: string
): Promise<void> {
  const data: {
    licenseId: string;
    tenantId: string;
    marketplaceItemId: string;
    reason?: string;
    canceledByUserId: string | null;
    cancellationSource: 'billing_webhook' | 'admin_action' | 'tenant_request';
  } = {
    licenseId,
    tenantId,
    marketplaceItemId,
    canceledByUserId,
    cancellationSource,
  };
  if (reason !== undefined) {
    data.reason = reason;
  }

  const payload: LicenseCanceledPayload = {
    id: randomUUID(),
    eventType: 'marketplace.license.canceled',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data,
  };

  await publishToNats('marketplace.license.canceled', payload);
}

/**
 * Publish an entitlement assigned event
 */
export async function publishEntitlementAssigned(
  entitlement: {
    id: string;
    licenseId: string;
    tenantId: string;
    loId: string;
    allowedGradeBands: MarketplaceGradeBand[];
    allowedSchoolIds: string[];
  },
  marketplaceItemId: string,
  assignedByUserId: string | null
): Promise<void> {
  const payload: EntitlementAssignedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.entitlement.assigned',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      entitlementId: entitlement.id,
      licenseId: entitlement.licenseId,
      tenantId: entitlement.tenantId,
      loId: entitlement.loId,
      marketplaceItemId,
      allowedGradeBands: entitlement.allowedGradeBands,
      allowedSchoolIds: entitlement.allowedSchoolIds,
      assignedByUserId,
    },
  };

  await publishToNats('marketplace.entitlement.assigned', payload);
}

/**
 * Publish an entitlement revoked event
 */
export async function publishEntitlementRevoked(
  entitlementId: string,
  licenseId: string,
  tenantId: string,
  loId: string,
  reason: string,
  revokedByUserId: string | null,
  revocationSource: 'license_expired' | 'license_canceled' | 'admin_action' | 'scope_changed'
): Promise<void> {
  const payload: EntitlementRevokedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.entitlement.revoked',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      entitlementId,
      licenseId,
      tenantId,
      loId,
      reason,
      revokedByUserId,
      revocationSource,
    },
  };

  await publishToNats('marketplace.entitlement.revoked', payload);
}

/**
 * Publish a seat assigned event
 */
export async function publishSeatAssigned(
  assignment: {
    id: string;
    licenseId: string;
    tenantId: string;
    learnerId: string;
    schoolId: string | null;
    classroomId: string | null;
    assignedByUserId: string;
  },
  marketplaceItemId: string,
  seatsUsedAfter: number,
  seatLimit: number | null
): Promise<void> {
  const payload: SeatAssignedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.seat.assigned',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      seatAssignmentId: assignment.id,
      licenseId: assignment.licenseId,
      tenantId: assignment.tenantId,
      learnerId: assignment.learnerId,
      marketplaceItemId,
      schoolId: assignment.schoolId,
      classroomId: assignment.classroomId,
      seatsUsedAfter,
      seatLimit,
      assignedByUserId: assignment.assignedByUserId,
    },
  };

  await publishToNats('marketplace.seat.assigned', payload);
}

/**
 * Publish a seat released event
 */
export async function publishSeatReleased(
  seatAssignmentId: string,
  licenseId: string,
  tenantId: string,
  learnerId: string,
  marketplaceItemId: string,
  seatsUsedAfter: number,
  releaseReason: string,
  releasedByUserId: string | null
): Promise<void> {
  const payload: SeatReleasedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.seat.released',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      seatAssignmentId,
      licenseId,
      tenantId,
      learnerId,
      marketplaceItemId,
      seatsUsedAfter,
      releaseReason,
      releasedByUserId,
    },
  };

  await publishToNats('marketplace.seat.released', payload);
}

/**
 * Publish a partner content usage event
 */
export async function publishPartnerContentUsage(
  tenantId: string,
  marketplaceItemId: string,
  vendorId: string,
  loId: string,
  learnerId: string,
  sessionId: string,
  subject: string,
  gradeBand: string,
  durationSeconds: number,
  schoolId?: string,
  classroomId?: string
): Promise<void> {
  const payload: PartnerContentUsagePayload = {
    id: randomUUID(),
    eventType: 'marketplace.pack.usage',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      tenantId,
      marketplaceItemId,
      vendorId,
      loId,
      learnerId,
      sessionId,
      schoolId: schoolId ?? null,
      classroomId: classroomId ?? null,
      subject,
      gradeBand,
      durationSeconds,
      completedAt: new Date().toISOString(),
    },
  };

  await publishToNats('marketplace.pack.usage', payload);
}

/**
 * Publish an entitlement check failed event
 * Used for alerting on misconfigured entitlements
 */
export async function publishEntitlementCheckFailed(
  tenantId: string,
  failureReason: EntitlementCheckFailedPayload['data']['failureReason'],
  requestedByService: string,
  loId?: string,
  marketplaceItemId?: string,
  learnerId?: string,
  schoolId?: string,
  classroomId?: string
): Promise<void> {
  const payload: EntitlementCheckFailedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.entitlement.check_failed',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      tenantId,
      loId: loId ?? null,
      marketplaceItemId: marketplaceItemId ?? null,
      learnerId: learnerId ?? null,
      schoolId: schoolId ?? null,
      classroomId: classroomId ?? null,
      failureReason,
      requestedByService,
    },
  };

  await publishToNats('marketplace.entitlement.check_failed', payload);
}

/**
 * Publish an installation created event
 */
export async function publishInstallationCreated(
  installation: {
    id: string;
    tenantId: string;
    marketplaceItemId: string;
    marketplaceItemVersionId: string;
    schoolId: string | null;
    classroomId: string | null;
    status: string;
    installedByUserId: string;
  },
  marketplaceItemSlug: string
): Promise<void> {
  const payload: InstallationCreatedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.installation.created',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      installationId: installation.id,
      tenantId: installation.tenantId,
      marketplaceItemId: installation.marketplaceItemId,
      marketplaceItemSlug,
      versionId: installation.marketplaceItemVersionId,
      schoolId: installation.schoolId,
      classroomId: installation.classroomId,
      status: installation.status,
      installedByUserId: installation.installedByUserId,
    },
  };

  await publishToNats('marketplace.installation.created', payload);
}

/**
 * Publish an installation approved event
 */
export async function publishInstallationApproved(
  installationId: string,
  tenantId: string,
  marketplaceItemId: string,
  approvedByUserId: string,
  approvalNotes: string | null
): Promise<void> {
  const payload: InstallationApprovedPayload = {
    id: randomUUID(),
    eventType: 'marketplace.installation.approved',
    occurredAt: new Date().toISOString(),
    source: 'marketplace-svc',
    data: {
      installationId,
      tenantId,
      marketplaceItemId,
      approvedByUserId,
      approvalNotes,
    },
  };

  await publishToNats('marketplace.installation.approved', payload);
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Internal publish helper with error handling
 */
async function publishToNats(subject: string, payload: MarketplaceDomainEvent): Promise<void> {
  if (!natsPublisher) {
    // Log but don't fail - NATS may not be connected in dev
    console.log(`[NATS] Would publish to ${subject}:`, JSON.stringify(payload, null, 2));
    return;
  }

  try {
    await natsPublisher.publish(`aivo.${subject}`, payload);
  } catch (error) {
    console.error(`[NATS] Failed to publish ${subject}:`, error);
    // Don't throw - marketplace operations should work even if NATS is down
  }
}
