/**
 * Marketplace Service Metrics
 *
 * Prometheus metrics for marketplace entitlement checks and license operations.
 */

import { Counter, Histogram, Gauge } from 'prom-client';

// ══════════════════════════════════════════════════════════════════════════════
// METRIC NAMES
// ══════════════════════════════════════════════════════════════════════════════

const METRIC_PREFIX = 'marketplace_';

export const MARKETPLACE_METRIC_NAMES = {
  // Entitlement checks
  ENTITLEMENT_CHECKS_TOTAL: `${METRIC_PREFIX}entitlement_checks_total`,
  ENTITLEMENT_CHECK_DURATION: `${METRIC_PREFIX}entitlement_check_duration_seconds`,
  ENTITLEMENT_DENIED_TOTAL: `${METRIC_PREFIX}entitlement_denied_total`,
  ENTITLED_LOS_TOTAL: `${METRIC_PREFIX}entitled_los_total`,

  // License operations
  LICENSE_CREATED_TOTAL: `${METRIC_PREFIX}license_created_total`,
  LICENSE_ACTIVATED_TOTAL: `${METRIC_PREFIX}license_activated_total`,
  LICENSE_EXPIRED_TOTAL: `${METRIC_PREFIX}license_expired_total`,
  ACTIVE_LICENSES: `${METRIC_PREFIX}active_licenses`,

  // Seat management
  SEATS_ASSIGNED_TOTAL: `${METRIC_PREFIX}seats_assigned_total`,
  SEATS_REVOKED_TOTAL: `${METRIC_PREFIX}seats_revoked_total`,
  SEATS_IN_USE: `${METRIC_PREFIX}seats_in_use`,

  // Partner content usage
  PARTNER_CONTENT_USAGE_TOTAL: `${METRIC_PREFIX}partner_content_usage_total`,
  PARTNER_CONTENT_DURATION: `${METRIC_PREFIX}partner_content_duration_seconds`,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// LABEL NAMES
// ══════════════════════════════════════════════════════════════════════════════

export const MARKETPLACE_LABELS = {
  TENANT_ID: 'tenant_id',
  VENDOR_ID: 'vendor_id',
  ITEM_ID: 'item_id',
  ITEM_TYPE: 'item_type',
  LICENSE_ID: 'license_id',
  DENIAL_REASON: 'denial_reason',
  CHECK_TYPE: 'check_type', // 'single' | 'batch'
  SCOPE_TYPE: 'scope_type', // 'tenant' | 'school' | 'classroom'
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// METRIC DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Total number of entitlement checks performed
 */
export const entitlementChecksTotal = new Counter({
  name: MARKETPLACE_METRIC_NAMES.ENTITLEMENT_CHECKS_TOTAL,
  help: 'Total number of marketplace entitlement checks',
  labelNames: [
    MARKETPLACE_LABELS.TENANT_ID,
    MARKETPLACE_LABELS.CHECK_TYPE,
    MARKETPLACE_LABELS.SCOPE_TYPE,
  ],
});

/**
 * Duration of entitlement check operations
 */
export const entitlementCheckDuration = new Histogram({
  name: MARKETPLACE_METRIC_NAMES.ENTITLEMENT_CHECK_DURATION,
  help: 'Duration of marketplace entitlement checks in seconds',
  labelNames: [MARKETPLACE_LABELS.CHECK_TYPE],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

/**
 * Total number of denied entitlement checks
 */
export const entitlementDeniedTotal = new Counter({
  name: MARKETPLACE_METRIC_NAMES.ENTITLEMENT_DENIED_TOTAL,
  help: 'Total number of denied marketplace entitlement checks',
  labelNames: [
    MARKETPLACE_LABELS.TENANT_ID,
    MARKETPLACE_LABELS.DENIAL_REASON,
  ],
});

/**
 * Total number of licensed LOs available
 */
export const entitledLosTotal = new Gauge({
  name: MARKETPLACE_METRIC_NAMES.ENTITLED_LOS_TOTAL,
  help: 'Total number of learning objects entitled through marketplace licenses',
  labelNames: [MARKETPLACE_LABELS.TENANT_ID],
});

/**
 * Total licenses created
 */
export const licenseCreatedTotal = new Counter({
  name: MARKETPLACE_METRIC_NAMES.LICENSE_CREATED_TOTAL,
  help: 'Total number of marketplace licenses created',
  labelNames: [
    MARKETPLACE_LABELS.TENANT_ID,
    MARKETPLACE_LABELS.VENDOR_ID,
    MARKETPLACE_LABELS.ITEM_TYPE,
  ],
});

/**
 * Total licenses activated
 */
export const licenseActivatedTotal = new Counter({
  name: MARKETPLACE_METRIC_NAMES.LICENSE_ACTIVATED_TOTAL,
  help: 'Total number of marketplace licenses activated',
  labelNames: [
    MARKETPLACE_LABELS.TENANT_ID,
    MARKETPLACE_LABELS.VENDOR_ID,
  ],
});

/**
 * Total licenses expired
 */
export const licenseExpiredTotal = new Counter({
  name: MARKETPLACE_METRIC_NAMES.LICENSE_EXPIRED_TOTAL,
  help: 'Total number of marketplace licenses expired',
  labelNames: [
    MARKETPLACE_LABELS.TENANT_ID,
    MARKETPLACE_LABELS.VENDOR_ID,
  ],
});

/**
 * Currently active licenses
 */
export const activeLicenses = new Gauge({
  name: MARKETPLACE_METRIC_NAMES.ACTIVE_LICENSES,
  help: 'Number of currently active marketplace licenses',
  labelNames: [MARKETPLACE_LABELS.TENANT_ID, MARKETPLACE_LABELS.ITEM_TYPE],
});

/**
 * Total seats assigned
 */
export const seatsAssignedTotal = new Counter({
  name: MARKETPLACE_METRIC_NAMES.SEATS_ASSIGNED_TOTAL,
  help: 'Total number of learner seats assigned',
  labelNames: [MARKETPLACE_LABELS.TENANT_ID, MARKETPLACE_LABELS.LICENSE_ID],
});

/**
 * Total seats revoked
 */
export const seatsRevokedTotal = new Counter({
  name: MARKETPLACE_METRIC_NAMES.SEATS_REVOKED_TOTAL,
  help: 'Total number of learner seats revoked',
  labelNames: [MARKETPLACE_LABELS.TENANT_ID, MARKETPLACE_LABELS.LICENSE_ID],
});

/**
 * Seats currently in use
 */
export const seatsInUse = new Gauge({
  name: MARKETPLACE_METRIC_NAMES.SEATS_IN_USE,
  help: 'Number of seats currently in use for a license',
  labelNames: [MARKETPLACE_LABELS.LICENSE_ID],
});

/**
 * Partner content usage counter
 */
export const partnerContentUsageTotal = new Counter({
  name: MARKETPLACE_METRIC_NAMES.PARTNER_CONTENT_USAGE_TOTAL,
  help: 'Total number of partner content usage events',
  labelNames: [
    MARKETPLACE_LABELS.TENANT_ID,
    MARKETPLACE_LABELS.VENDOR_ID,
    MARKETPLACE_LABELS.ITEM_ID,
  ],
});

/**
 * Duration of partner content sessions
 */
export const partnerContentDuration = new Histogram({
  name: MARKETPLACE_METRIC_NAMES.PARTNER_CONTENT_DURATION,
  help: 'Duration of partner content sessions in seconds',
  labelNames: [
    MARKETPLACE_LABELS.VENDOR_ID,
    MARKETPLACE_LABELS.ITEM_TYPE,
  ],
  buckets: [30, 60, 120, 300, 600, 1200, 1800, 3600],
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Record an entitlement check
 */
export function recordEntitlementCheck(params: {
  tenantId: string;
  checkType: 'single' | 'batch';
  scopeType: 'tenant' | 'school' | 'classroom';
  durationMs: number;
}): void {
  const { tenantId, checkType, scopeType, durationMs } = params;

  entitlementChecksTotal
    .labels(tenantId, checkType, scopeType)
    .inc();

  entitlementCheckDuration
    .labels(checkType)
    .observe(durationMs / 1000);
}

/**
 * Record a denied entitlement check
 */
export function recordEntitlementDenied(params: {
  tenantId: string;
  reason: 'no_license' | 'scope_mismatch' | 'seats_exhausted' | 'license_expired' | 'license_suspended';
}): void {
  const { tenantId, reason } = params;

  entitlementDeniedTotal
    .labels(tenantId, reason)
    .inc();
}

/**
 * Record a license lifecycle event
 */
export function recordLicenseEvent(params: {
  event: 'created' | 'activated' | 'expired';
  tenantId: string;
  vendorId: string;
  itemType?: string;
}): void {
  const { event, tenantId, vendorId, itemType } = params;

  switch (event) {
    case 'created':
      licenseCreatedTotal
        .labels(tenantId, vendorId, itemType || 'unknown')
        .inc();
      break;
    case 'activated':
      licenseActivatedTotal
        .labels(tenantId, vendorId)
        .inc();
      break;
    case 'expired':
      licenseExpiredTotal
        .labels(tenantId, vendorId)
        .inc();
      break;
  }
}

/**
 * Record partner content usage
 */
export function recordPartnerContentUsage(params: {
  tenantId: string;
  vendorId: string;
  itemId: string;
  durationMs?: number;
  itemType?: string;
}): void {
  const { tenantId, vendorId, itemId, durationMs, itemType } = params;

  partnerContentUsageTotal
    .labels(tenantId, vendorId, itemId)
    .inc();

  if (durationMs && itemType) {
    partnerContentDuration
      .labels(vendorId, itemType)
      .observe(durationMs / 1000);
  }
}

/**
 * Update seat usage gauge
 */
export function updateSeatUsage(licenseId: string, seatsUsed: number): void {
  seatsInUse.labels(licenseId).set(seatsUsed);
}

/**
 * Update active licenses gauge for a tenant
 */
export function updateActiveLicenses(params: {
  tenantId: string;
  itemType: string;
  count: number;
}): void {
  activeLicenses.labels(params.tenantId, params.itemType).set(params.count);
}

/**
 * Update entitled LOs gauge for a tenant
 */
export function updateEntitledLos(tenantId: string, count: number): void {
  entitledLosTotal.labels(tenantId).set(count);
}

// ══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE METRICS COLLECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface MarketplaceMetrics {
  entitlementChecksTotal: typeof entitlementChecksTotal;
  entitlementCheckDuration: typeof entitlementCheckDuration;
  entitlementDeniedTotal: typeof entitlementDeniedTotal;
  entitledLosTotal: typeof entitledLosTotal;
  licenseCreatedTotal: typeof licenseCreatedTotal;
  licenseActivatedTotal: typeof licenseActivatedTotal;
  licenseExpiredTotal: typeof licenseExpiredTotal;
  activeLicenses: typeof activeLicenses;
  seatsAssignedTotal: typeof seatsAssignedTotal;
  seatsRevokedTotal: typeof seatsRevokedTotal;
  seatsInUse: typeof seatsInUse;
  partnerContentUsageTotal: typeof partnerContentUsageTotal;
  partnerContentDuration: typeof partnerContentDuration;
}

export const marketplaceMetrics: MarketplaceMetrics = {
  entitlementChecksTotal,
  entitlementCheckDuration,
  entitlementDeniedTotal,
  entitledLosTotal,
  licenseCreatedTotal,
  licenseActivatedTotal,
  licenseExpiredTotal,
  activeLicenses,
  seatsAssignedTotal,
  seatsRevokedTotal,
  seatsInUse,
  partnerContentUsageTotal,
  partnerContentDuration,
};
