/**
 * Tenant/District Analytics API Client
 * Types and fetch functions for district admin analytics dashboard.
 */

import { getServiceUrl } from './env-utils';

const ANALYTICS_BASE_URL = getServiceUrl(
  'NEXT_PUBLIC_ANALYTICS_URL',
  'http://localhost:4030',
  'Tenant Analytics API'
);

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface MasteryBucket {
  range: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

export interface ModuleUsage {
  moduleName: string;
  enabled: boolean;
  activeUsers: number;
  usagePercentage: number;
}

export interface TenantEngagement {
  activeSchoolsCount: number;
  totalSchoolsCount: number;
  activeClassroomsCount: number;
  totalClassroomsCount: number;
  activeLearnersCount: number;
  totalLearnersCount: number;
  avgSessionsPerLearner: number;
  totalSessions: number;
  totalMinutes: number;
}

export interface TenantProgress {
  overallAvgMastery: number;
  masteryDistribution: MasteryBucket[];
  learnersWithProgressData: number;
}

export interface DailyTrend {
  date: string;
  sessions: number;
  activeLearners: number;
}

export interface TenantOverviewResponse {
  tenantId: string;
  tenantName: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  engagement: TenantEngagement;
  progress: TenantProgress;
  moduleUsage: ModuleUsage[];
  dailyTrend: DailyTrend[];
}

export interface SchoolSummary {
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

export interface TenantSchoolsResponse {
  tenantId: string;
  period: { from: string; to: string };
  dataFreshAsOf: string;
  schools: SchoolSummary[];
  totalSchools: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchTenantOverview(
  tenantId: string,
  options?: { from?: string; to?: string }
): Promise<TenantOverviewResponse> {
  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);

  const url = `${ANALYTICS_BASE_URL}/analytics/tenants/${tenantId}/overview?${params.toString()}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch tenant overview: ${res.status}`);
  }

  return res.json() as Promise<TenantOverviewResponse>;
}

export async function fetchTenantSchools(
  tenantId: string,
  options?: { from?: string; to?: string }
): Promise<TenantSchoolsResponse> {
  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);

  const url = `${ANALYTICS_BASE_URL}/analytics/tenants/${tenantId}/schools?${params.toString()}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch tenant schools: ${res.status}`);
  }

  return res.json() as Promise<TenantSchoolsResponse>;
}
