import type { ReactNode } from 'react';

import {
  fetchBaselineProfile,
  fetchVirtualBrainSummary,
  type BaselineProfileView,
  type VirtualBrainSummary,
} from '../../../../../lib/learner-insights';
import {
  fetchGoals,
  fetchSessionPlans,
  fetchProgressNotes,
  mockGoals,
  mockSessionPlans,
  mockProgressNotes,
  type Goal,
  type SessionPlan,
  type ProgressNote,
} from '../../../../../lib/teacher-planning-api';

import { LearnerProfileClient } from './profile-client';
import type { LearnerData } from './context';

interface Props {
  params: Promise<{ classroomId: string; learnerId: string }>;
  children: ReactNode;
}

interface LearnerDto {
  id: string;
  tenant_id: string;
  name: string;
  grade?: number;
}

async function fetchLearner(learnerId: string): Promise<LearnerDto | null> {
  try {
    const res = await fetch(
      `${process.env.LEARNER_API_URL || 'http://localhost:4001'}/api/learners/${learnerId}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return res.json() as Promise<LearnerDto>;
  } catch {
    // Return mock data in development
    return {
      id: learnerId,
      tenant_id: 'tenant-1',
      name: 'Jordan Rivers',
      grade: 4,
    };
  }
}

async function loadBaselineData(learnerId: string): Promise<BaselineProfileView | null> {
  try {
    return await fetchBaselineProfile(learnerId);
  } catch {
    return null;
  }
}

async function loadVirtualBrainData(learnerId: string): Promise<VirtualBrainSummary | null> {
  try {
    return await fetchVirtualBrainSummary(learnerId);
  } catch {
    return null;
  }
}

async function loadGoals(learnerId: string): Promise<Goal[]> {
  try {
    const res = await fetchGoals(learnerId);
    return res.data;
  } catch {
    return mockGoals(learnerId);
  }
}

async function loadSessionPlans(learnerId: string): Promise<SessionPlan[]> {
  try {
    const res = await fetchSessionPlans(learnerId);
    return res.data;
  } catch {
    return mockSessionPlans(learnerId);
  }
}

async function loadProgressNotes(learnerId: string): Promise<ProgressNote[]> {
  try {
    const res = await fetchProgressNotes(learnerId);
    return res.data;
  } catch {
    return mockProgressNotes(learnerId);
  }
}

/**
 * Learner Profile Layout
 *
 * Server component that fetches initial data and wraps children
 * with the profile client (theming + context).
 */
export default async function LearnerProfileLayout({ params, children }: Props) {
  const { classroomId, learnerId } = await params;

  // Fetch all data in parallel
  const [learnerDto, baseline, virtualBrain, goals, sessionPlans, progressNotes] =
    await Promise.all([
      fetchLearner(learnerId),
      loadBaselineData(learnerId),
      loadVirtualBrainData(learnerId),
      loadGoals(learnerId),
      loadSessionPlans(learnerId),
      loadProgressNotes(learnerId),
    ]);

  // Map to LearnerData
  const learner: LearnerData = {
    id: learnerId,
    name: learnerDto?.name ?? 'Unknown Learner',
    grade: learnerDto?.grade ?? null,
    tenantId: learnerDto?.tenant_id ?? 'unknown',
  };

  return (
    <LearnerProfileClient
      classroomId={classroomId}
      learnerId={learnerId}
      learner={learner}
      baseline={baseline}
      virtualBrain={virtualBrain}
      initialGoals={goals}
      initialSessionPlans={sessionPlans}
      initialProgressNotes={progressNotes}
    >
      {children}
    </LearnerProfileClient>
  );
}
