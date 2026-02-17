import { Role, hasRole } from '@aivo/ts-rbac';

import type { AuthSession } from './auth';
import type { GradeBand } from './billing-api';
import { gradeToBand } from './grade-band';

export type AllowedRole = Role.TEACHER | Role.THERAPIST | Role.DISTRICT_ADMIN;

export const ALLOWED_VIEWER_ROLES: AllowedRole[] = [
  Role.TEACHER,
  Role.THERAPIST,
  Role.DISTRICT_ADMIN,
];

export interface BaselineDomainScore {
  domain: string;
  score: number; // 0-1
  label?: string;
}

export interface BaselineAttemptSummary {
  attemptId: string;
  attemptNumber: number;
  status: string;
  startedAt?: string;
  completedAt?: string | null;
  score?: number | null;
  retestReason?: string | null;
}

export interface BaselineProfileView {
  profileId: string;
  learnerId: string;
  learnerName?: string;
  grade?: number;
  gradeBand: GradeBand;
  status: string;
  domainScores: BaselineDomainScore[];
  attempts: BaselineAttemptSummary[];
  latestAttemptId?: string;
}

export interface SkillStateView {
  id: string;
  skillCode: string;
  displayName: string;
  domain: string;
  masteryLevel: number;
  confidence?: number;
  practiceCount?: number;
  correctStreak?: number;
  lastAssessedAt?: string;
  description?: string | null;
}

export interface VirtualBrainSummary {
  id: string;
  learnerId: string;
  gradeBand: GradeBand;
  tenantId: string;
  summary?: {
    byDomain?: Record<string, { count: number; avgMastery: number }>;
  };
  skillStates: SkillStateView[];
}

export function hasInsightsAccess(roles: Role[] | undefined | null): boolean {
  return hasRole(roles ?? [], ALLOWED_VIEWER_ROLES);
}

function parseResponseSafe<T>(data: unknown, fallback: T): T {
  if (!data || typeof data !== 'object') return fallback;
  return data as T;
}

export async function fetchBaselineProfile(
  learnerId: string,
  session?: AuthSession | null
): Promise<BaselineProfileView> {
  const baseUrl = process.env.BASELINE_SVC_URL || 'http://localhost:4010';
  const url = `${baseUrl}/baseline/profiles/by-learner/${learnerId}`;

  const res = await fetch(url, {
    ...(session?.accessToken && {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch baseline profile: ${res.status}`);
  }

  const data = await res.json();
  const parsed = parseResponseSafe<BaselineProfileView>(data, data as BaselineProfileView);
  if (!parsed.gradeBand) {
    return {
      ...parsed,
      gradeBand: gradeToBand(parsed.grade ?? null),
    } as BaselineProfileView;
  }
  return parsed;
}

export async function fetchVirtualBrainSummary(
  learnerId: string,
  session?: AuthSession | null
): Promise<VirtualBrainSummary> {
  const baseUrl = process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:4015';
  const url = `${baseUrl}/virtual-brains/${learnerId}`;

  const res = await fetch(url, {
    ...(session?.accessToken && {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch virtual brain summary: ${res.status}`);
  }

  const data = await res.json();
  const parsed = parseResponseSafe<VirtualBrainSummary>(data, data as VirtualBrainSummary);
  if (!parsed.gradeBand) {
    parsed.gradeBand = gradeToBand(null);
  }
  return parsed;
}

export function summarizeMastery(skillStates: SkillStateView[]) {
  const sorted = [...skillStates].sort((a, b) => b.masteryLevel - a.masteryLevel);
  return {
    strengths: sorted.slice(0, 3),
    focusAreas: sorted.slice(-3),
  };
}
