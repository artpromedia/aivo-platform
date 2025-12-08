import { Role, hasRole } from '@aivo/ts-rbac';
import type { GradeBand } from '@aivo/ui-web';

import type { AuthSession } from './auth';
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

function mockBaselineProfile(learnerId: string): BaselineProfileView {
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return {
    profileId: 'mock-profile-' + learnerId,
    learnerId,
    learnerName: 'Jordan Rivers',
    grade: 4,
    gradeBand: 'K5',
    status: 'COMPLETED',
    domainScores: [
      { domain: 'ELA', score: 0.72, label: 'Strong comprehension' },
      { domain: 'MATH', score: 0.58, label: 'Growing arithmetic' },
      { domain: 'SCIENCE', score: 0.66, label: 'Curious thinker' },
      { domain: 'SPEECH', score: 0.49, label: 'Needs articulation support' },
      { domain: 'SEL', score: 0.63, label: 'Solid peer collaboration' },
    ],
    attempts: [
      {
        attemptId: 'attempt-1',
        attemptNumber: 1,
        status: 'COMPLETED',
        startedAt: yesterday.toISOString(),
        completedAt: yesterday.toISOString(),
        score: 0.54,
      },
      {
        attemptId: 'attempt-2',
        attemptNumber: 2,
        status: 'COMPLETED',
        startedAt: today.toISOString(),
        completedAt: today.toISOString(),
        score: 0.68,
        retestReason: 'DISTRACTED',
      },
    ],
    latestAttemptId: 'attempt-2',
  };
}

function mockVirtualBrain(learnerId: string): VirtualBrainSummary {
  const skills: SkillStateView[] = [
    {
      id: 'ss-ela-1',
      skillCode: 'ELA_PHONEMIC_AWARENESS',
      displayName: 'Phonemic Awareness',
      domain: 'ELA',
      masteryLevel: 0.82,
      practiceCount: 22,
      correctStreak: 5,
    },
    {
      id: 'ss-ela-2',
      skillCode: 'ELA_READING_FLUENCY',
      displayName: 'Reading Fluency',
      domain: 'ELA',
      masteryLevel: 0.44,
      practiceCount: 14,
      correctStreak: 2,
    },
    {
      id: 'ss-math-1',
      skillCode: 'MATH_COUNTING',
      displayName: 'Counting and Cardinality',
      domain: 'MATH',
      masteryLevel: 0.91,
      practiceCount: 30,
      correctStreak: 7,
    },
    {
      id: 'ss-math-2',
      skillCode: 'MATH_ADDITION',
      displayName: 'Addition Within 20',
      domain: 'MATH',
      masteryLevel: 0.36,
      practiceCount: 10,
      correctStreak: 1,
    },
    {
      id: 'ss-speech-1',
      skillCode: 'SPEECH_ARTICULATION',
      displayName: 'Articulation',
      domain: 'SPEECH',
      masteryLevel: 0.41,
      practiceCount: 6,
      correctStreak: 1,
    },
    {
      id: 'ss-sel-1',
      skillCode: 'SEL_SELF_AWARENESS',
      displayName: 'Self-Awareness',
      domain: 'SEL',
      masteryLevel: 0.64,
      practiceCount: 9,
      correctStreak: 3,
    },
  ];

  return {
    id: 'vb-' + learnerId,
    learnerId,
    gradeBand: 'K5',
    tenantId: 'mock-tenant',
    summary: {
      byDomain: skills.reduce<Record<string, { count: number; avgMastery: number }>>(
        (acc, skill) => {
          const group = acc[skill.domain] ?? { count: 0, avgMastery: 0 };
          group.count += 1;
          group.avgMastery =
            (group.avgMastery * (group.count - 1) + skill.masteryLevel) / group.count;
          acc[skill.domain] = group;
          return acc;
        },
        {}
      ),
    },
    skillStates: skills,
  };
}

export async function fetchBaselineProfile(
  learnerId: string,
  session?: AuthSession | null
): Promise<BaselineProfileView> {
  const baseUrl = process.env.BASELINE_SVC_URL || 'http://localhost:4010';
  const url = `${baseUrl}/baseline/profiles/by-learner/${learnerId}`;

  try {
    const res = await fetch(url, {
      ...(session?.accessToken && {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return mockBaselineProfile(learnerId);
    }

    const data = await res.json();
    const parsed = parseResponseSafe<BaselineProfileView>(data, mockBaselineProfile(learnerId));
    if (!parsed.gradeBand) {
      return {
        ...parsed,
        gradeBand: gradeToBand(parsed.grade ?? null),
      } as BaselineProfileView;
    }
    return parsed;
  } catch (err) {
    console.warn('Falling back to mock baseline profile', err);
    return mockBaselineProfile(learnerId);
  }
}

export async function fetchVirtualBrainSummary(
  learnerId: string,
  session?: AuthSession | null
): Promise<VirtualBrainSummary> {
  const baseUrl = process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:4015';
  const url = `${baseUrl}/virtual-brains/${learnerId}`;

  try {
    const res = await fetch(url, {
      ...(session?.accessToken && {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return mockVirtualBrain(learnerId);
    }

    const data = await res.json();
    const parsed = parseResponseSafe<VirtualBrainSummary>(data, mockVirtualBrain(learnerId));
    if (!parsed.gradeBand) {
      parsed.gradeBand = gradeToBand(null);
    }
    return parsed;
  } catch (err) {
    console.warn('Falling back to mock virtual brain', err);
    return mockVirtualBrain(learnerId);
  }
}

export function summarizeMastery(skillStates: SkillStateView[]) {
  const sorted = [...skillStates].sort((a, b) => b.masteryLevel - a.masteryLevel);
  return {
    strengths: sorted.slice(0, 3),
    focusAreas: sorted.slice(-3),
  };
}
