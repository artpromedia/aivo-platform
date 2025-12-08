/**
 * API client for teacher-planning-svc
 *
 * Handles goals, objectives, session plans, and progress notes.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type GoalDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL' | 'OTHER';
export type GoalStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ObjectiveStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MET' | 'NOT_MET';
export type SessionPlanType = 'LEARNING' | 'THERAPY' | 'GROUP' | 'ASSESSMENT' | 'PRACTICE' | 'OTHER';
export type SessionPlanStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ProgressRating = 0 | 1 | 2 | 3 | 4;

export interface Goal {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  title: string;
  description: string | null;
  domain: GoalDomain;
  skillId: string | null;
  startDate: string;
  targetDate: string | null;
  status: GoalStatus;
  progressRating: ProgressRating | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  objectives?: GoalObjective[];
  skill?: { id: string; name: string };
}

export interface GoalObjective {
  id: string;
  goalId: string;
  description: string;
  successCriteria: string | null;
  status: ObjectiveStatus;
  progressRating: ProgressRating | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionPlan {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionTemplateName: string | null;
  scheduledFor: string | null;
  estimatedDurationMinutes: number | null;
  sessionType: SessionPlanType;
  status: SessionPlanStatus;
  sessionId: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  items?: SessionPlanItem[];
}

export interface SessionPlanItem {
  id: string;
  sessionPlanId: string;
  orderIndex: number;
  goalId: string | null;
  goalObjectiveId: string | null;
  skillId: string | null;
  activityType: string;
  activityDescription: string | null;
  estimatedDurationMinutes: number | null;
}

export interface ProgressNote {
  id: string;
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionId: string | null;
  sessionPlanId: string | null;
  goalId: string | null;
  goalObjectiveId: string | null;
  noteText: string;
  rating: ProgressRating | null;
  evidenceUri: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const TEACHER_PLANNING_SVC_URL = process.env.NEXT_PUBLIC_TEACHER_PLANNING_SVC_URL || '/api/planning';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${TEACHER_PLANNING_SVC_URL}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers ?? {}),
  };
  
  const res = await fetch(url, {
    ...(options ?? {}),
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
    throw new Error(errorData.message ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════════════════════
// GOALS API
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchGoals(
  learnerId: string,
  params?: { status?: GoalStatus; domain?: GoalDomain; page?: number; pageSize?: number }
): Promise<PaginatedResponse<Goal>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.domain) searchParams.set('domain', params.domain);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString();
  return apiFetch<PaginatedResponse<Goal>>(
    `/learners/${learnerId}/goals${query ? `?${query}` : ''}`
  );
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  domain: GoalDomain;
  skillId?: string;
  startDate?: string;
  targetDate?: string;
  metadataJson?: Record<string, unknown>;
}

export async function createGoal(learnerId: string, input: CreateGoalInput): Promise<Goal> {
  return apiFetch<Goal>(`/learners/${learnerId}/goals`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  status?: GoalStatus;
  targetDate?: string | null;
  progressRating?: ProgressRating | null;
}

export async function updateGoal(goalId: string, input: UpdateGoalInput): Promise<Goal> {
  return apiFetch<Goal>(`/goals/${goalId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// OBJECTIVES API
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateObjectiveInput {
  description: string;
  successCriteria?: string;
  orderIndex?: number;
}

export async function createObjective(
  goalId: string,
  input: CreateObjectiveInput
): Promise<GoalObjective> {
  return apiFetch<GoalObjective>(`/goals/${goalId}/objectives`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface UpdateObjectiveInput {
  description?: string;
  successCriteria?: string | null;
  status?: ObjectiveStatus;
  progressRating?: ProgressRating | null;
}

export async function updateObjective(
  objectiveId: string,
  input: UpdateObjectiveInput
): Promise<GoalObjective> {
  return apiFetch<GoalObjective>(`/goal-objectives/${objectiveId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLANS API
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchSessionPlans(
  learnerId: string,
  params?: { status?: SessionPlanStatus; page?: number; pageSize?: number }
): Promise<PaginatedResponse<SessionPlan>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString();
  return apiFetch<PaginatedResponse<SessionPlan>>(
    `/learners/${learnerId}/session-plans${query ? `?${query}` : ''}`
  );
}

export interface CreateSessionPlanInput {
  sessionType: SessionPlanType;
  scheduledFor?: string;
  templateName?: string;
  goalIds?: string[];
  estimatedDurationMinutes?: number;
}

export async function createSessionPlan(
  learnerId: string,
  input: CreateSessionPlanInput
): Promise<SessionPlan> {
  return apiFetch<SessionPlan>(`/learners/${learnerId}/session-plans`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateSessionPlan(
  planId: string,
  input: { status?: SessionPlanStatus; scheduledFor?: string | null }
): Promise<SessionPlan> {
  return apiFetch<SessionPlan>(`/session-plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS NOTES API
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchProgressNotes(
  learnerId: string,
  params?: { goalId?: string; sessionId?: string; page?: number; pageSize?: number }
): Promise<PaginatedResponse<ProgressNote>> {
  const searchParams = new URLSearchParams();
  if (params?.goalId) searchParams.set('goalId', params.goalId);
  if (params?.sessionId) searchParams.set('sessionId', params.sessionId);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString();
  return apiFetch<PaginatedResponse<ProgressNote>>(
    `/learners/${learnerId}/progress-notes${query ? `?${query}` : ''}`
  );
}

export interface CreateProgressNoteInput {
  learnerId: string;
  sessionId?: string;
  sessionPlanId?: string;
  goalId?: string;
  goalObjectiveId?: string;
  noteText: string;
  rating?: ProgressRating;
  evidenceUri?: string;
}

export async function createProgressNote(input: CreateProgressNoteInput): Promise<ProgressNote> {
  return apiFetch<ProgressNote>('/progress-notes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN DETAIL API
// ══════════════════════════════════════════════════════════════════════════════

/** Session plan with enriched goals for the Run Session view */
export interface SessionPlanDetail extends SessionPlan {
  /** Map of goalId -> Goal for items in this plan */
  goals: Record<string, Goal>;
  /** Linked goalIds from metadata */
  linkedGoalIds: string[];
}

/**
 * Fetch session plan with full details including enriched goals
 */
export async function fetchSessionPlanDetail(planId: string): Promise<SessionPlanDetail> {
  return apiFetch<SessionPlanDetail>(`/session-plans/${planId}/detail`);
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA (for development/fallback)
// ══════════════════════════════════════════════════════════════════════════════

export function mockGoals(learnerId: string): Goal[] {
  return [
    {
      id: 'goal-1',
      tenantId: 'tenant-1',
      learnerId,
      createdByUserId: 'user-1',
      title: 'Improve reading fluency to grade level',
      description: 'Student will read grade-level text with 95% accuracy and appropriate expression',
      domain: 'ELA',
      skillId: 'skill-reading-fluency',
      startDate: '2025-01-01',
      targetDate: '2025-06-01',
      status: 'ACTIVE',
      progressRating: 2,
      metadataJson: { standardsTag: 'CCSS.ELA-LITERACY.RF.3.4' },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z',
      objectives: [
        {
          id: 'obj-1',
          goalId: 'goal-1',
          description: 'Read 50 WPM with less than 3 errors',
          successCriteria: '3 consecutive sessions meeting criteria',
          status: 'MET',
          progressRating: 4,
          orderIndex: 0,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-02-01T00:00:00Z',
        },
        {
          id: 'obj-2',
          goalId: 'goal-1',
          description: 'Read 75 WPM with less than 3 errors',
          successCriteria: '3 consecutive sessions meeting criteria',
          status: 'IN_PROGRESS',
          progressRating: 2,
          orderIndex: 1,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-02-15T00:00:00Z',
        },
      ],
      skill: { id: 'skill-reading-fluency', name: 'Reading Fluency' },
    },
    {
      id: 'goal-2',
      tenantId: 'tenant-1',
      learnerId,
      createdByUserId: 'user-1',
      title: 'Master multiplication facts 1-12',
      description: 'Student will recall multiplication facts within 3 seconds with 90% accuracy',
      domain: 'MATH',
      skillId: 'skill-mult-facts',
      startDate: '2025-01-15',
      targetDate: '2025-05-15',
      status: 'ACTIVE',
      progressRating: 1,
      metadataJson: null,
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
      objectives: [
        {
          id: 'obj-3',
          goalId: 'goal-2',
          description: 'Recall facts 1-5 within 3 seconds',
          successCriteria: '90% accuracy on timed assessment',
          status: 'IN_PROGRESS',
          progressRating: 2,
          orderIndex: 0,
          createdAt: '2025-01-15T00:00:00Z',
          updatedAt: '2025-02-01T00:00:00Z',
        },
      ],
      skill: { id: 'skill-mult-facts', name: 'Multiplication Facts' },
    },
  ];
}

export function mockSessionPlans(learnerId: string): SessionPlan[] {
  return [
    {
      id: 'plan-1',
      tenantId: 'tenant-1',
      learnerId,
      createdByUserId: 'user-1',
      sessionTemplateName: 'Reading Fluency Session',
      scheduledFor: '2025-12-10T10:00:00Z',
      estimatedDurationMinutes: 45,
      sessionType: 'LEARNING',
      status: 'PLANNED',
      sessionId: null,
      metadataJson: null,
      createdAt: '2025-12-01T00:00:00Z',
      updatedAt: '2025-12-01T00:00:00Z',
    },
    {
      id: 'plan-2',
      tenantId: 'tenant-1',
      learnerId,
      createdByUserId: 'user-1',
      sessionTemplateName: 'Math Practice',
      scheduledFor: '2025-12-12T14:00:00Z',
      estimatedDurationMinutes: 30,
      sessionType: 'PRACTICE',
      status: 'DRAFT',
      sessionId: null,
      metadataJson: null,
      createdAt: '2025-12-02T00:00:00Z',
      updatedAt: '2025-12-02T00:00:00Z',
    },
  ];
}

export function mockProgressNotes(learnerId: string): ProgressNote[] {
  return [
    {
      id: 'note-1',
      tenantId: 'tenant-1',
      learnerId,
      createdByUserId: 'user-1',
      sessionId: null,
      sessionPlanId: 'plan-1',
      goalId: 'goal-1',
      goalObjectiveId: 'obj-2',
      noteText: 'Student read 68 WPM today with 2 errors. Showing improvement in expression. Practiced with "Charlotte\'s Web" passage.',
      rating: 3,
      evidenceUri: null,
      createdAt: '2025-12-05T15:30:00Z',
      updatedAt: '2025-12-05T15:30:00Z',
    },
    {
      id: 'note-2',
      tenantId: 'tenant-1',
      learnerId,
      createdByUserId: 'user-1',
      sessionId: null,
      sessionPlanId: null,
      goalId: 'goal-2',
      goalObjectiveId: 'obj-3',
      noteText: 'Practiced 5s and 6s multiplication tables. Student struggled with 6x7 and 6x8. Used manipulatives to help visualize.',
      rating: 2,
      evidenceUri: null,
      createdAt: '2025-12-04T14:00:00Z',
      updatedAt: '2025-12-04T14:00:00Z',
    },
    {
      id: 'note-3',
      tenantId: 'tenant-1',
      learnerId,
      createdByUserId: 'user-1',
      sessionId: null,
      sessionPlanId: null,
      goalId: 'goal-1',
      goalObjectiveId: null,
      noteText: 'Great session! Student self-corrected multiple times and showed improved confidence when reading aloud.',
      rating: 4,
      evidenceUri: null,
      createdAt: '2025-12-02T10:00:00Z',
      updatedAt: '2025-12-02T10:00:00Z',
    },
  ];
}
