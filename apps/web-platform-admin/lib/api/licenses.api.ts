/**
 * Licenses API
 *
 * API client for license management and revenue tracking.
 * Connects to billing-svc for real license and revenue data.
 */

import { apiClient, serviceUrls, buildQueryString, type PaginatedResponse } from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type LicensePlan = 'starter' | 'professional' | 'enterprise' | 'pilot';
export type LicenseStatus = 'active' | 'warning' | 'expired' | 'trial' | 'suspended';

export interface TenantLicense {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: LicensePlan;
  seatsUsed: number;
  seatsTotal: number;
  seatsAllocated: number;
  startsAt: string;
  expiresAt: string;
  status: LicenseStatus;
  features: string[];
  monthlyRevenue: number;
  annualValue: number;
  autoRenew: boolean;
  lastPaymentDate?: string;
  nextBillingDate?: string;
  paymentMethod?: 'invoice' | 'card' | 'ach';
  contractId?: string;
  notes?: string;
}

export interface LicenseSummary {
  totalSeats: number;
  usedSeats: number;
  allocatedSeats: number;
  utilizationPercent: number;
  totalTenants: number;
  activeTenants: number;
  expiringThisMonth: number;
  expiringThisQuarter: number;
  trialTenants: number;
  suspendedTenants: number;
}

export interface RevenueMetrics {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  currentPeriodRevenue: number;
  previousPeriodRevenue: number;
  changePercent: number;
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  expansionRevenue: number;
  newRevenue: number;
  renewalRevenue: number;
  revenueByPlan: {
    plan: LicensePlan;
    revenue: number;
    count: number;
  }[];
  revenueTimeline: {
    date: string;
    revenue: number;
    newCustomers: number;
    churned: number;
  }[];
}

export interface RenewalPipeline {
  upcomingRenewals: {
    tenantId: string;
    tenantName: string;
    plan: LicensePlan;
    expiresAt: string;
    annualValue: number;
    renewalLikelihood: 'high' | 'medium' | 'low';
    lastEngagement: string;
  }[];
  totalValue: number;
  highRiskValue: number;
  expectedRenewalRate: number;
}

export interface UsageStatistics {
  tenantId: string;
  tenantName: string;
  seatsUsed: number;
  seatsTotal: number;
  utilizationPercent: number;
  activeUsersLast30Days: number;
  avgSessionsPerUser: number;
  topFeatures: { feature: string; usageCount: number }[];
  trend: 'growing' | 'stable' | 'declining';
}

export interface LicenseFilters {
  status?: LicenseStatus;
  plan?: LicensePlan;
  expiringWithinDays?: number;
  search?: string;
  minSeats?: number;
  maxSeats?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch license summary across all tenants
 */
export async function getLicenseSummary(
  accessToken: string
): Promise<LicenseSummary> {
  return apiClient<LicenseSummary>(
    serviceUrls.BILLING_SVC_URL,
    '/admin/licenses/summary',
    { accessToken, retries: 1 }
  );
}

/**
 * Fetch all tenant licenses with optional filters
 */
export async function listLicenses(
  accessToken: string,
  filters?: LicenseFilters,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<TenantLicense>> {
  const query = buildQueryString({ ...filters, page, pageSize });
  return apiClient<PaginatedResponse<TenantLicense>>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses${query}`,
    { accessToken, retries: 1 }
  );
}

/**
 * Fetch a single license by ID
 */
export async function getLicense(
  accessToken: string,
  licenseId: string
): Promise<TenantLicense> {
  return apiClient<TenantLicense>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses/${licenseId}`,
    { accessToken }
  );
}

/**
 * Fetch revenue metrics
 */
export async function getRevenueMetrics(
  accessToken: string,
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<RevenueMetrics> {
  return apiClient<RevenueMetrics>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/revenue/metrics?period=${period}`,
    { accessToken, retries: 1 }
  );
}

/**
 * Fetch renewal pipeline
 */
export async function getRenewalPipeline(
  accessToken: string,
  daysAhead = 90
): Promise<RenewalPipeline> {
  return apiClient<RenewalPipeline>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses/renewals?daysAhead=${daysAhead}`,
    { accessToken }
  );
}

/**
 * Fetch usage statistics for a tenant
 */
export async function getTenantUsageStats(
  accessToken: string,
  tenantId: string
): Promise<UsageStatistics> {
  return apiClient<UsageStatistics>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses/tenants/${tenantId}/usage`,
    { accessToken }
  );
}

/**
 * Fetch licenses expiring soon
 */
export async function getExpiringLicenses(
  accessToken: string,
  daysAhead = 30
): Promise<TenantLicense[]> {
  const response = await apiClient<PaginatedResponse<TenantLicense>>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses?expiringWithinDays=${daysAhead}&pageSize=100`,
    { accessToken }
  );
  return response.data;
}

/**
 * Update license seats
 */
export async function updateLicenseSeats(
  accessToken: string,
  licenseId: string,
  newSeatCount: number,
  reason: string
): Promise<TenantLicense> {
  return apiClient<TenantLicense>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses/${licenseId}/seats`,
    {
      method: 'PATCH',
      body: JSON.stringify({ seats: newSeatCount, reason }),
      accessToken,
    }
  );
}

/**
 * Extend license expiration
 */
export async function extendLicense(
  accessToken: string,
  licenseId: string,
  newExpirationDate: string,
  reason: string
): Promise<TenantLicense> {
  return apiClient<TenantLicense>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses/${licenseId}/extend`,
    {
      method: 'POST',
      body: JSON.stringify({ expiresAt: newExpirationDate, reason }),
      accessToken,
    }
  );
}

/**
 * Suspend a license
 */
export async function suspendLicense(
  accessToken: string,
  licenseId: string,
  reason: string
): Promise<TenantLicense> {
  return apiClient<TenantLicense>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses/${licenseId}/suspend`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
      accessToken,
    }
  );
}

/**
 * Reactivate a suspended license
 */
export async function reactivateLicense(
  accessToken: string,
  licenseId: string
): Promise<TenantLicense> {
  return apiClient<TenantLicense>(
    serviceUrls.BILLING_SVC_URL,
    `/admin/licenses/${licenseId}/reactivate`,
    {
      method: 'POST',
      accessToken,
    }
  );
}
