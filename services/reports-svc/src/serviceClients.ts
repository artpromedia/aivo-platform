/**
 * Service clients for fetching data from other microservices.
 * All clients handle errors gracefully and return null on failures.
 */

import { config } from './config.js';

// ══════════════════════════════════════════════════════════════════════════════
// HELPER
// ══════════════════════════════════════════════════════════════════════════════

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(`Service request failed: ${url} - ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`Service request error: ${url}`, err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BASELINE SERVICE CLIENT
// ══════════════════════════════════════════════════════════════════════════════

interface BaselineProfileResponse {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINAL_ACCEPTED' | 'RETEST_ALLOWED';
  gradeBand: string;
  acceptedAt?: string;
  domainScores?: {
    domain: string;
    score: number;
    maxScore: number;
  }[];
}

export async function fetchBaselineProfile(
  learnerId: string,
  tenantId: string,
  token: string
): Promise<BaselineProfileResponse | null> {
  return fetchJson(
    `${config.services.baseline}/baseline/profiles?learnerId=${learnerId}&tenantId=${tenantId}`,
    token
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIRTUAL BRAIN SERVICE CLIENT
// ══════════════════════════════════════════════════════════════════════════════

interface VirtualBrainResponse {
  id: string;
  learnerId: string;
  gradeBand: string;
  skillStates: {
    skillCode: string;
    domain: string;
    displayName: string;
    description: string | null;
    masteryLevel: number;
    confidence: number;
  }[];
  summary: {
    totalSkills: number;
    byDomain: Record<string, { count: number; avgMastery: number }>;
  };
}

export async function fetchVirtualBrain(
  learnerId: string,
  token: string
): Promise<VirtualBrainResponse | null> {
  return fetchJson(`${config.services.learnerModel}/virtual-brains/${learnerId}`, token);
}

// ══════════════════════════════════════════════════════════════════════════════
// GOALS SERVICE CLIENT
// ══════════════════════════════════════════════════════════════════════════════

interface GoalResponse {
  id: string;
  title: string;
  description: string | null;
  domain: string;
  status: 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  progressRating: number | null;
  startDate: string;
  targetDate: string | null;
  objectives: {
    id: string;
    description: string;
    status: string;
    progressRating: number | null;
  }[];
}

interface GoalsListResponse {
  goals: GoalResponse[];
  total: number;
}

export async function fetchLearnerGoals(
  learnerId: string,
  tenantId: string,
  token: string
): Promise<GoalsListResponse | null> {
  return fetchJson(
    `${config.services.goal}/goals?learnerId=${learnerId}&tenantId=${tenantId}`,
    token
  );
}

export async function fetchClassroomGoals(
  classroomId: string,
  tenantId: string,
  token: string
): Promise<GoalsListResponse | null> {
  return fetchJson(
    `${config.services.goal}/goals?classroomId=${classroomId}&tenantId=${tenantId}`,
    token
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS SERVICE CLIENT
// ══════════════════════════════════════════════════════════════════════════════

interface HomeworkSummaryResponse {
  learnerId: string;
  homeworkSessionsPerWeek: number;
  avgStepsPerHomework: number;
  independenceScore: number;
  independenceLabel: string;
  independenceLabelText: string;
  lastHomeworkDate: string | null;
  totalHomeworkSessions: number;
}

interface FocusSummaryResponse {
  learnerId: string;
  avgFocusBreaksPerSession: number;
  avgSessionDurationMinutes: number;
  totalSessions: number;
  summary: string;
}

interface ClassroomHomeworkUsageResponse {
  classroomId: string;
  totalLearners: number;
  learnersWithHomework: number;
  avgSessionsPerWeekPerLearner: number;
  independenceDistribution: {
    needsSupport: number;
    buildingIndependence: number;
    mostlyIndependent: number;
  };
  learnerMetrics: {
    learnerId: string;
    learnerName?: string;
    homeworkSessionsPerWeek: number;
    independenceLabel: string;
  }[];
}

interface ClassroomFocusPatternsResponse {
  classroomId: string;
  totalSessions: number;
  avgBreaksPerSession: number;
  focusLossPercentage: number;
  patternsByTime: { hour: number; sessionsCount: number }[];
}

export async function fetchHomeworkSummary(
  parentId: string,
  learnerId: string,
  token: string,
  days = 28
): Promise<HomeworkSummaryResponse | null> {
  return fetchJson(
    `${config.services.analytics}/analytics/parents/${parentId}/learners/${learnerId}/homework-summary?days=${days}`,
    token
  );
}

export async function fetchFocusSummary(
  parentId: string,
  learnerId: string,
  token: string,
  days = 28
): Promise<FocusSummaryResponse | null> {
  return fetchJson(
    `${config.services.analytics}/analytics/parents/${parentId}/learners/${learnerId}/focus-summary?days=${days}`,
    token
  );
}

export async function fetchClassroomHomeworkUsage(
  tenantId: string,
  classroomId: string,
  token: string,
  days = 28
): Promise<ClassroomHomeworkUsageResponse | null> {
  return fetchJson(
    `${config.services.analytics}/analytics/tenants/${tenantId}/classrooms/${classroomId}/homework-usage?days=${days}`,
    token
  );
}

export async function fetchClassroomFocusPatterns(
  tenantId: string,
  classroomId: string,
  token: string,
  days = 28
): Promise<ClassroomFocusPatternsResponse | null> {
  return fetchJson(
    `${config.services.analytics}/analytics/tenants/${tenantId}/classrooms/${classroomId}/focus-patterns?days=${days}`,
    token
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TENANT SERVICE CLIENT (for learner/classroom info)
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerInfoResponse {
  id: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  classroomIds: string[];
}

interface ClassroomInfoResponse {
  id: string;
  name: string;
  tenantId: string;
  learnerIds: string[];
}

export async function fetchLearnerInfo(
  learnerId: string,
  token: string
): Promise<LearnerInfoResponse | null> {
  return fetchJson(`${config.services.tenant}/learners/${learnerId}`, token);
}

export async function fetchClassroomInfo(
  classroomId: string,
  token: string
): Promise<ClassroomInfoResponse | null> {
  return fetchJson(`${config.services.tenant}/classrooms/${classroomId}`, token);
}

export async function fetchClassroomLearners(
  classroomId: string,
  token: string
): Promise<LearnerInfoResponse[] | null> {
  return fetchJson(`${config.services.tenant}/classrooms/${classroomId}/learners`, token);
}
