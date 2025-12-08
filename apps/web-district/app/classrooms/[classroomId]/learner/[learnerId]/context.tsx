'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { Goal, SessionPlan, ProgressNote } from '../../../../../lib/teacher-planning-api';
import type { BaselineProfileView, VirtualBrainSummary } from '../../../../../lib/learner-insights';

export interface LearnerData {
  id: string;
  name: string;
  grade: number | null;
  tenantId: string;
}

export interface LearnerProfileContextValue {
  learner: LearnerData;
  classroomId: string;
  baseline: BaselineProfileView | null;
  virtualBrain: VirtualBrainSummary | null;
  goals: Goal[];
  sessionPlans: SessionPlan[];
  progressNotes: ProgressNote[];
  refetchGoals: () => Promise<void>;
  refetchSessionPlans: () => Promise<void>;
  refetchProgressNotes: () => Promise<void>;
}

const LearnerProfileContext = createContext<LearnerProfileContextValue | null>(null);

export function LearnerProfileProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: LearnerProfileContextValue;
}) {
  return (
    <LearnerProfileContext.Provider value={value}>
      {children}
    </LearnerProfileContext.Provider>
  );
}

export function useLearnerProfile(): LearnerProfileContextValue {
  const context = useContext(LearnerProfileContext);
  if (!context) {
    throw new Error('useLearnerProfile must be used within LearnerProfileProvider');
  }
  return context;
}
