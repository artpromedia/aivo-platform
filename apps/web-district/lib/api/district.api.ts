/**
 * District Dashboard API Client
 *
 * Server-side API client for fetching district dashboard data from:
 * - iep-svc: IEP dashboard, compliance alerts
 * - tenant-svc: School list
 * - analytics-svc: Tenant overview, school analytics
 * - sis-sync-svc: SIS sync status
 *
 * All functions throw on error — no mock fallbacks.
 * Callers should handle errors with try/catch and show "Unable to load" states.
 */

import { getServiceUrl } from '../env-utils';

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE BASE URLS
// ══════════════════════════════════════════════════════════════════════════════

const IEP_BASE = getServiceUrl('IEP_SVC_URL', 'http://localhost:4016', 'IEP Service');
const TENANT_BASE = getServiceUrl('TENANT_SVC_URL', 'http://localhost:4002', 'Tenant Service');
const ANALYTICS_BASE = getServiceUrl(
  'NEXT_PUBLIC_ANALYTICS_URL',
  'http://localhost:4030',
  'Analytics Service'
);
const SIS_SYNC_BASE = getServiceUrl(
  'SIS_SYNC_SVC_URL',
  'http://localhost:4020',
  'SIS Sync Service'
);

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** iep-svc GET /ieps/dashboard response */
export interface IEPDashboard {
  totalStudents: number;
  activeIEPs: number;
  byStatus: Record<string, number>;
  upcomingMeetings: {
    id: string;
    scheduledDate: string;
    status: string;
    iep: {
      student: { firstName: string; lastName: string };
    };
  }[];
  openComplianceAlerts: number;
  compliance: {
    percentage: number;
    overdueAnnualReviews: number;
    overdueReevaluations: number;
    totalAlerts: number;
  };
  goals: {
    total: number;
    completed: number;
    overdue: number;
    onTimeRate: number;
  };
}

/** iep-svc GET /compliance/alerts response */
export interface ComplianceAlertsResponse {
  data: ComplianceAlert[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ComplianceAlert {
  id: string;
  tenantId: string;
  iepId?: string;
  studentId?: string;
  alertType: string;
  severity: string;
  status: string;
  message?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** tenant-svc GET /tenants/:id/schools response */
export interface TenantSchoolsListResponse {
  total: number;
  items: TenantSchool[];
}

export interface TenantSchool {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** analytics-svc GET /analytics/tenants/:id/overview response */
export interface AnalyticsOverview {
  tenantId: string;
  tenantName: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  engagement: {
    activeSchoolsCount: number;
    totalSchoolsCount: number;
    activeClassroomsCount: number;
    totalClassroomsCount: number;
    activeLearnersCount: number;
    totalLearnersCount: number;
    avgSessionsPerLearner: number;
    totalSessions: number;
    totalMinutes: number;
  };
  progress: {
    overallAvgMastery: number;
    masteryDistribution: {
      range: string;
      minScore: number;
      maxScore: number;
      count: number;
      percentage: number;
    }[];
    learnersWithProgressData: number;
  };
  moduleUsage: {
    moduleName: string;
    enabled: boolean;
    activeUsers: number;
    usagePercentage: number;
  }[];
  dailyTrend: {
    date: string;
    sessions: number;
    activeLearners: number;
  }[];
}

/** analytics-svc GET /analytics/tenants/:id/schools response */
export interface AnalyticsSchoolsResponse {
  tenantId: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  schools: AnalyticsSchool[];
  totalSchools: number;
}

export interface AnalyticsSchool {
  schoolId: string;
  schoolName: string;
  learnersCount: number;
  activeLearnersCount: number;
  classroomsCount: number;
  avgSessionsPerLearner: number;
  totalSessions: number;
  avgMastery: number;
  engagementRate: number;
}

/** sis-sync-svc provider */
export interface SISProvider {
  id: string;
  tenantId: string;
  providerType: string;
  name: string;
  enabled: boolean;
  integrationStatus: string;
  lastSyncAt: string | null;
  syncSchedule: string | null;
  createdAt: string;
  updatedAt: string;
}

/** sis-sync-svc sync status */
export interface SISSyncStatus {
  provider: SISProvider;
  syncState: {
    id: string;
    tenantId: string;
    providerId: string;
    lastSyncAt: string | null;
    lastDeltaToken: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  lastSyncRun: {
    id: string;
    tenantId: string;
    providerId: string;
    syncType: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    recordsProcessed: number;
    recordsFailed: number;
    errorMessage: string | null;
  } | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function fetchJSON<T>(url: string, label: string): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`[${label}] HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch IEP dashboard data (totals, compliance, goals, upcoming meetings).
 * iep-svc GET /ieps/dashboard
 */
export async function fetchIEPDashboard(_tenantId: string): Promise<IEPDashboard> {
  return fetchJSON<IEPDashboard>(`${IEP_BASE}/ieps/dashboard`, 'IEP Dashboard');
}

/**
 * Fetch compliance alerts.
 * iep-svc GET /compliance/alerts
 */
export async function fetchComplianceAlerts(
  tenantId: string,
  options: { status?: string; page?: number; pageSize?: number } = {}
): Promise<ComplianceAlertsResponse> {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));

  const qs = params.toString();
  return fetchJSON<ComplianceAlertsResponse>(
    `${IEP_BASE}/compliance/alerts${qs ? `?${qs}` : ''}`,
    'Compliance Alerts'
  );
}

/**
 * Fetch schools for a tenant.
 * tenant-svc GET /tenants/:id/schools
 */
export async function fetchTenantSchools(tenantId: string): Promise<TenantSchoolsListResponse> {
  return fetchJSON<TenantSchoolsListResponse>(
    `${TENANT_BASE}/tenants/${tenantId}/schools`,
    'Tenant Schools'
  );
}

/**
 * Fetch tenant analytics overview (engagement, progress, module usage, trends).
 * analytics-svc GET /analytics/tenants/:tenantId/overview
 */
export async function fetchAnalyticsOverview(tenantId: string): Promise<AnalyticsOverview> {
  return fetchJSON<AnalyticsOverview>(
    `${ANALYTICS_BASE}/analytics/tenants/${tenantId}/overview`,
    'Analytics Overview'
  );
}

/**
 * Fetch school-level analytics.
 * analytics-svc GET /analytics/tenants/:tenantId/schools
 */
export async function fetchAnalyticsSchools(tenantId: string): Promise<AnalyticsSchoolsResponse> {
  return fetchJSON<AnalyticsSchoolsResponse>(
    `${ANALYTICS_BASE}/analytics/tenants/${tenantId}/schools`,
    'Analytics Schools'
  );
}

/**
 * Fetch SIS sync status for all providers of a tenant.
 * sis-sync-svc GET /tenants/:tenantId/providers → for each provider, GET .../sync/status
 */
export async function fetchSISSyncStatus(tenantId: string): Promise<SISSyncStatus[]> {
  const { providers } = await fetchJSON<{ providers: SISProvider[] }>(
    `${SIS_SYNC_BASE}/tenants/${tenantId}/providers`,
    'SIS Providers'
  );

  if (providers.length === 0) {
    return [];
  }

  const statuses = await Promise.all(
    providers.map(async (provider) => {
      const status = await fetchJSON<{
        syncState: SISSyncStatus['syncState'];
        lastSyncRun: SISSyncStatus['lastSyncRun'];
      }>(
        `${SIS_SYNC_BASE}/tenants/${tenantId}/providers/${provider.id}/sync/status`,
        `SIS Sync Status (${provider.name})`
      );

      return {
        provider,
        syncState: status.syncState,
        lastSyncRun: status.lastSyncRun,
      };
    })
  );

  return statuses;
}

// ══════════════════════════════════════════════════════════════════════════════
// AGGREGATED DASHBOARD FETCH
// ══════════════════════════════════════════════════════════════════════════════

export interface DistrictDashboardData {
  iepDashboard: IEPDashboard | null;
  complianceAlerts: ComplianceAlertsResponse | null;
  schools: TenantSchoolsListResponse | null;
  analyticsOverview: AnalyticsOverview | null;
  analyticsSchools: AnalyticsSchoolsResponse | null;
  sisSyncStatuses: SISSyncStatus[];
  errors: string[];
}

/**
 * Fetch all dashboard data in parallel, with per-section error isolation.
 * If one service is down, other sections still render.
 */
export async function fetchDistrictDashboard(tenantId: string): Promise<DistrictDashboardData> {
  const errors: string[] = [];

  const [
    iepDashboard,
    complianceAlerts,
    schools,
    analyticsOverview,
    analyticsSchools,
    sisSyncStatuses,
  ] = await Promise.all([
    fetchIEPDashboard(tenantId).catch((e: unknown) => {
      errors.push(`IEP Dashboard: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    fetchComplianceAlerts(tenantId, { status: 'OPEN', pageSize: 10 }).catch((e: unknown) => {
      errors.push(`Compliance Alerts: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    fetchTenantSchools(tenantId).catch((e: unknown) => {
      errors.push(`Tenant Schools: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    fetchAnalyticsOverview(tenantId).catch((e: unknown) => {
      errors.push(`Analytics Overview: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    fetchAnalyticsSchools(tenantId).catch((e: unknown) => {
      errors.push(`Analytics Schools: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }),
    fetchSISSyncStatus(tenantId).catch((e: unknown) => {
      errors.push(`SIS Sync: ${e instanceof Error ? e.message : String(e)}`);
      return [] as SISSyncStatus[];
    }),
  ]);

  return {
    iepDashboard,
    complianceAlerts,
    schools,
    analyticsOverview,
    analyticsSchools,
    sisSyncStatuses,
    errors,
  };
}
