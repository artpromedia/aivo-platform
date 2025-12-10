/**
 * Tenant/District Analytics API Client
 * Types and fetch functions for district admin analytics dashboard.
 */

const ANALYTICS_BASE_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:4030';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_ANALYTICS_MOCK === 'true';

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
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function mockTenantOverview(tenantId: string): TenantOverviewResponse {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 28);

  return {
    tenantId,
    tenantName: 'Springfield School District',
    period: { from: formatDateString(from), to: formatDateString(now) },
    dataFreshAsOf: now.toISOString(),
    engagement: {
      activeSchoolsCount: 12,
      totalSchoolsCount: 14,
      activeClassroomsCount: 156,
      totalClassroomsCount: 180,
      activeLearnersCount: 3420,
      totalLearnersCount: 4500,
      avgSessionsPerLearner: 8.2,
      totalSessions: 36900,
      totalMinutes: 553500,
    },
    progress: {
      overallAvgMastery: 0.67,
      masteryDistribution: [
        { range: '0-20%', minScore: 0, maxScore: 0.2, count: 225, percentage: 5 },
        { range: '20-40%', minScore: 0.2, maxScore: 0.4, count: 540, percentage: 12 },
        { range: '40-60%', minScore: 0.4, maxScore: 0.6, count: 1080, percentage: 24 },
        { range: '60-80%', minScore: 0.6, maxScore: 0.8, count: 1800, percentage: 40 },
        { range: '80-100%', minScore: 0.8, maxScore: 1.0, count: 855, percentage: 19 },
      ],
      learnersWithProgressData: 4500,
    },
    moduleUsage: [
      { moduleName: 'Homework Helper', enabled: true, activeUsers: 2850, usagePercentage: 83 },
      { moduleName: 'Focus Mode', enabled: true, activeUsers: 2394, usagePercentage: 70 },
      { moduleName: 'SEL Content', enabled: true, activeUsers: 1710, usagePercentage: 50 },
    ],
    dailyTrend: [
      { date: '2024-12-02', sessions: 1850, activeLearners: 1420 },
      { date: '2024-12-03', sessions: 2100, activeLearners: 1580 },
      { date: '2024-12-04', sessions: 1920, activeLearners: 1490 },
      { date: '2024-12-05', sessions: 2050, activeLearners: 1550 },
      { date: '2024-12-06', sessions: 1780, activeLearners: 1380 },
      { date: '2024-12-09', sessions: 2200, activeLearners: 1620 },
    ],
  };
}

function mockTenantSchools(tenantId: string): TenantSchoolsResponse {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 28);

  return {
    tenantId,
    period: { from: formatDateString(from), to: formatDateString(now) },
    dataFreshAsOf: now.toISOString(),
    schools: [
      {
        schoolId: 'school-1',
        schoolName: 'Maple Elementary',
        learnersCount: 420,
        activeLearnersCount: 385,
        classroomsCount: 18,
        avgSessionsPerLearner: 9.2,
        totalSessions: 3864,
        avgMastery: 0.72,
        engagementRate: 92,
      },
      {
        schoolId: 'school-2',
        schoolName: 'Cedar Middle School',
        learnersCount: 610,
        activeLearnersCount: 524,
        classroomsCount: 24,
        avgSessionsPerLearner: 8.5,
        totalSessions: 5185,
        avgMastery: 0.68,
        engagementRate: 86,
      },
      {
        schoolId: 'school-3',
        schoolName: 'Riverside High',
        learnersCount: 920,
        activeLearnersCount: 736,
        classroomsCount: 36,
        avgSessionsPerLearner: 7.8,
        totalSessions: 7176,
        avgMastery: 0.65,
        engagementRate: 80,
      },
      {
        schoolId: 'school-4',
        schoolName: 'Pineview Academy',
        learnersCount: 180,
        activeLearnersCount: 108,
        classroomsCount: 8,
        avgSessionsPerLearner: 5.2,
        totalSessions: 936,
        avgMastery: 0.58,
        engagementRate: 60,
      },
    ],
    totalSchools: 14,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchTenantOverview(
  tenantId: string,
  accessToken: string,
  options?: { from?: string; to?: string }
): Promise<TenantOverviewResponse> {
  if (USE_MOCK) {
    return mockTenantOverview(tenantId);
  }

  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);

  const url = `${ANALYTICS_BASE_URL}/analytics/tenants/${tenantId}/overview?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
  accessToken: string,
  options?: { from?: string; to?: string }
): Promise<TenantSchoolsResponse> {
  if (USE_MOCK) {
    return mockTenantSchools(tenantId);
  }

  const params = new URLSearchParams();
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);

  const url = `${ANALYTICS_BASE_URL}/analytics/tenants/${tenantId}/schools?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch tenant schools: ${res.status}`);
  }

  return res.json() as Promise<TenantSchoolsResponse>;
}
