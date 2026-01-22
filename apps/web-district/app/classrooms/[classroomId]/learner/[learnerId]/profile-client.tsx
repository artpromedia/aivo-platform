'use client';

import { GradeThemeProvider, Heading, Badge } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useState, type ReactNode } from 'react';

import type { BaselineProfileView, VirtualBrainSummary } from '../../../../../lib/learner-insights';
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

import { LearnerProfileProvider, type LearnerData } from './context';
import { ProfileTabs } from './profile-tabs';

interface LearnerProfileClientProps {
  classroomId: string;
  learnerId: string;
  learner: LearnerData;
  baseline: BaselineProfileView | null;
  virtualBrain: VirtualBrainSummary | null;
  initialGoals: Goal[];
  initialSessionPlans: SessionPlan[];
  initialProgressNotes: ProgressNote[];
  children: ReactNode;
}

export function LearnerProfileClient({
  classroomId,
  learnerId,
  learner,
  baseline,
  virtualBrain,
  initialGoals,
  initialSessionPlans,
  initialProgressNotes,
  children,
}: LearnerProfileClientProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [sessionPlans, setSessionPlans] = useState<SessionPlan[]>(initialSessionPlans);
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>(initialProgressNotes);

  const refetchGoals = useCallback(async () => {
    try {
      const res = await fetchGoals(learnerId);
      setGoals(res.data);
    } catch {
      // Fallback to mock data in development
      setGoals(mockGoals(learnerId));
    }
  }, [learnerId]);

  const refetchSessionPlans = useCallback(async () => {
    try {
      const res = await fetchSessionPlans(learnerId);
      setSessionPlans(res.data);
    } catch {
      setSessionPlans(mockSessionPlans(learnerId));
    }
  }, [learnerId]);

  const refetchProgressNotes = useCallback(async () => {
    try {
      const res = await fetchProgressNotes(learnerId);
      setProgressNotes(res.data);
    } catch {
      setProgressNotes(mockProgressNotes(learnerId));
    }
  }, [learnerId]);

  const baseUrl = `/classrooms/${classroomId}/learner/${learnerId}`;

  return (
    <GradeThemeProvider initialGrade={learner.grade ?? undefined}>
      <LearnerProfileProvider
        value={{
          learner,
          classroomId,
          baseline,
          virtualBrain,
          goals,
          sessionPlans,
          progressNotes,
          refetchGoals,
          refetchSessionPlans,
          refetchProgressNotes,
        }}
      >
        <main className="flex flex-col gap-6">
          {/* Header */}
          <header className="flex flex-col gap-2">
            <nav className="text-sm text-muted">
              <Link href={`/classrooms/${classroomId}`} className="hover:text-text hover:underline">
                Classroom
              </Link>
              <span className="mx-2">›</span>
              <span>Learner Profile</span>
            </nav>

            <div className="flex items-start justify-between gap-4">
              <div>
                <Heading level={1} kicker={`Grade ${learner.grade ?? 'N/A'}`}>
                  {learner.name}
                </Heading>
              </div>
              <Badge tone="info">Grade {learner.grade ?? 'N/A'} Theme</Badge>
            </div>
          </header>

          {/* Tabs */}
          <ProfileTabs baseUrl={baseUrl}>{children}</ProfileTabs>
        </main>
      </LearnerProfileProvider>
    </GradeThemeProvider>
  );
}
