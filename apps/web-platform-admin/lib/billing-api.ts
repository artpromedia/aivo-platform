/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Platform Admin Billing & Usage Analytics API
 *
 * Client functions for seat usage alerts and analytics.
 * Server-side only (uses internal service URLs).
 */

// Service URL - required in production
const BILLING_SVC_URL = (() => {
  const url = process.env.BILLING_SVC_URL;
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('BILLING_SVC_URL environment variable is required in production');
  }
  return url ?? 'http://localhost:4005';
})();

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SeatUsageAlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface SeatUsageAlert {
  id: string;
  tenantId: string;
  tenantName?: string;
  sku: string;
  gradeBand: string;
  threshold: number;
  status: SeatUsageAlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  contextJson?: {
    committed: number;
    allocated: number;
    utilization: number;
    overage: number;
    overageAllowed: boolean;
    overageLimit?: number;
  };
}

export interface TenantSeatUsageSummary {
  tenantId: string;
  tenantName: string;
  totalCommitted: number;
  totalAllocated: number;
  overallUtilization: number;
  openAlertCount: number;
  criticalAlertCount: number;
  gradeBandUsage: {
    gradeBand: string;
    committed: number;
    allocated: number;
    utilization: number;
  }[];
}

export interface PlatformUsageMetrics {
  totalTenants: number;
  tenantsWithAlerts: number;
  totalSeatsCommitted: number;
  totalSeatsAllocated: number;
  overallUtilization: number;
  alertsByStatus: {
    open: number;
    acknowledged: number;
    resolved: number;
  };
  alertsByThreshold: {
    warning80: number;
    atLimit100: number;
    overage110: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export function getGradeBandLabel(gradeBand: string): string {
  const labels: Record<string, string> = {
    K_2: 'K-2',
    GRADE_3_5: '3-5',
    GRADE_6_8: '6-8',
    GRADE_9_12: '9-12',
    ALL: 'All Grades',
  };
  return labels[gradeBand] ?? gradeBand;
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function getThresholdLabel(threshold: number): string {
  if (threshold >= 1.1) return 'Overage';
  if (threshold >= 1) return 'At Limit';
  return 'Warning';
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

interface FetchOptions extends RequestInit {
  accessToken?: string;
}

async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  const url = `${BILLING_SVC_URL}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({ message: res.statusText }))) as {
      message?: string;
    };
    throw new Error(errorData.message ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch all open seat usage alerts across all tenants
 */
export async function fetchAllAlerts(
  status?: SeatUsageAlertStatus,
  accessToken?: string
): Promise<SeatUsageAlert[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);

  try {
    return await apiFetch<SeatUsageAlert[]>(`/admin/seat-usage/alerts?${params}`, { accessToken });
  } catch (error) {
    // Fallback to mock data in development only
    if (process.env.NODE_ENV === 'development') {
      console.warn('[BillingAPI] Falling back to mock alerts:', error);
      return getMockAlerts().filter((a) => !status || a.status === status);
    }
    throw error;
  }
}

/**
 * Fetch seat usage summary for all tenants
 */
export async function fetchAllTenantUsageSummaries(
  accessToken?: string
): Promise<TenantSeatUsageSummary[]> {
  try {
    return await apiFetch<TenantSeatUsageSummary[]>('/admin/seat-usage/summaries', { accessToken });
  } catch (error) {
    // Fallback to mock data in development only
    if (process.env.NODE_ENV === 'development') {
      console.warn('[BillingAPI] Falling back to mock summaries:', error);
      return getMockTenantSummaries();
    }
    throw error;
  }
}

/**
 * Fetch platform-wide usage metrics
 */
export async function fetchPlatformMetrics(accessToken?: string): Promise<PlatformUsageMetrics> {
  try {
    return await apiFetch<PlatformUsageMetrics>('/admin/seat-usage/metrics', { accessToken });
  } catch (error) {
    // Fallback to mock data in development only
    if (process.env.NODE_ENV === 'development') {
      console.warn('[BillingAPI] Falling back to mock metrics:', error);
      return getMockPlatformMetrics();
    }
    throw error;
  }
}

/**
 * Acknowledge an alert (admin action)
 */
export async function acknowledgeAlert(alertId: string, accessToken?: string): Promise<void> {
  await apiFetch<void>(`/admin/seat-usage/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    accessToken,
  });
}

/**
 * Resolve an alert (admin action)
 */
export async function resolveAlert(
  alertId: string,
  resolution: string,
  accessToken?: string
): Promise<void> {
  await apiFetch<void>(`/admin/seat-usage/alerts/${alertId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolution }),
    accessToken,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function getMockAlerts(): SeatUsageAlert[] {
  return [
    {
      id: 'alert-001',
      tenantId: 'tenant-001',
      tenantName: 'North Valley USD',
      sku: 'AIVO_CORE',
      gradeBand: 'GRADE_3_5',
      threshold: 0.8,
      status: 'OPEN',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      contextJson: {
        committed: 500,
        allocated: 425,
        utilization: 85,
        overage: 0,
        overageAllowed: true,
        overageLimit: 50,
      },
    },
    {
      id: 'alert-002',
      tenantId: 'tenant-002',
      tenantName: 'Metro ISD',
      sku: 'AIVO_CORE',
      gradeBand: 'GRADE_6_8',
      threshold: 1,
      status: 'OPEN',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      contextJson: {
        committed: 800,
        allocated: 800,
        utilization: 100,
        overage: 0,
        overageAllowed: true,
        overageLimit: 80,
      },
    },
    {
      id: 'alert-003',
      tenantId: 'tenant-002',
      tenantName: 'Metro ISD',
      sku: 'AIVO_CORE',
      gradeBand: 'K_2',
      threshold: 1.1,
      status: 'OPEN',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      contextJson: {
        committed: 400,
        allocated: 460,
        utilization: 115,
        overage: 60,
        overageAllowed: true,
        overageLimit: 40,
      },
    },
    {
      id: 'alert-004',
      tenantId: 'tenant-003',
      tenantName: 'Riverside School District',
      sku: 'AIVO_CORE',
      gradeBand: 'GRADE_9_12',
      threshold: 0.8,
      status: 'ACKNOWLEDGED',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      contextJson: {
        committed: 600,
        allocated: 510,
        utilization: 85,
        overage: 0,
        overageAllowed: false,
      },
    },
    {
      id: 'alert-005',
      tenantId: 'tenant-001',
      tenantName: 'North Valley USD',
      sku: 'AIVO_CORE',
      gradeBand: 'GRADE_6_8',
      threshold: 0.8,
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      contextJson: {
        committed: 350,
        allocated: 300,
        utilization: 86,
        overage: 0,
        overageAllowed: true,
        overageLimit: 35,
      },
    },
  ];
}

function getMockTenantSummaries(): TenantSeatUsageSummary[] {
  return [
    {
      tenantId: 'tenant-001',
      tenantName: 'North Valley USD',
      totalCommitted: 1250,
      totalAllocated: 1100,
      overallUtilization: 88,
      openAlertCount: 1,
      criticalAlertCount: 0,
      gradeBandUsage: [
        { gradeBand: 'K_2', committed: 300, allocated: 270, utilization: 90 },
        { gradeBand: 'GRADE_3_5', committed: 500, allocated: 425, utilization: 85 },
        { gradeBand: 'GRADE_6_8', committed: 350, allocated: 310, utilization: 89 },
        { gradeBand: 'GRADE_9_12', committed: 100, allocated: 95, utilization: 95 },
      ],
    },
    {
      tenantId: 'tenant-002',
      tenantName: 'Metro ISD',
      totalCommitted: 2200,
      totalAllocated: 2460,
      overallUtilization: 112,
      openAlertCount: 2,
      criticalAlertCount: 1,
      gradeBandUsage: [
        { gradeBand: 'K_2', committed: 400, allocated: 460, utilization: 115 },
        { gradeBand: 'GRADE_3_5', committed: 500, allocated: 500, utilization: 100 },
        { gradeBand: 'GRADE_6_8', committed: 800, allocated: 800, utilization: 100 },
        { gradeBand: 'GRADE_9_12', committed: 500, allocated: 700, utilization: 140 },
      ],
    },
    {
      tenantId: 'tenant-003',
      tenantName: 'Riverside School District',
      totalCommitted: 1800,
      totalAllocated: 1620,
      overallUtilization: 90,
      openAlertCount: 0,
      criticalAlertCount: 0,
      gradeBandUsage: [
        { gradeBand: 'K_2', committed: 400, allocated: 360, utilization: 90 },
        { gradeBand: 'GRADE_3_5', committed: 450, allocated: 400, utilization: 89 },
        { gradeBand: 'GRADE_6_8', committed: 350, allocated: 350, utilization: 100 },
        { gradeBand: 'GRADE_9_12', committed: 600, allocated: 510, utilization: 85 },
      ],
    },
  ];
}

function getMockPlatformMetrics(): PlatformUsageMetrics {
  return {
    totalTenants: 45,
    tenantsWithAlerts: 8,
    totalSeatsCommitted: 52000,
    totalSeatsAllocated: 48500,
    overallUtilization: 93,
    alertsByStatus: {
      open: 12,
      acknowledged: 5,
      resolved: 87,
    },
    alertsByThreshold: {
      warning80: 8,
      atLimit100: 3,
      overage110: 1,
    },
  };
}
