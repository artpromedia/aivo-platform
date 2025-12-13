/**
 * Goal Service Type Definitions
 */

import type { GoalDomain, GoalStatus, ObjectiveStatus, SessionPlanType, SessionPlanStatus } from './prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// AUTH/REQUEST TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AuthUser {
  userId: string;
  tenantId: string;
  role: string;
  learnerId?: string;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// GOAL TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateGoalInput {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  title: string;
  description?: string;
  domain: GoalDomain;
  skillId?: string;
  startDate?: Date;
  targetDate?: Date;
  status?: GoalStatus;
  metadataJson?: Record<string, unknown>;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  domain?: GoalDomain;
  skillId?: string | null;
  startDate?: Date;
  targetDate?: Date | null;
  status?: GoalStatus;
  progressRating?: number | null;
  metadataJson?: Record<string, unknown> | null;
}

export interface GoalFilters {
  tenantId: string;
  learnerId?: string;
  createdByUserId?: string;
  status?: GoalStatus | GoalStatus[];
  domain?: GoalDomain | GoalDomain[];
  skillId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateObjectiveInput {
  goalId: string;
  description: string;
  successCriteria?: string;
  status?: ObjectiveStatus;
  orderIndex?: number;
}

export interface UpdateObjectiveInput {
  description?: string;
  successCriteria?: string | null;
  status?: ObjectiveStatus;
  progressRating?: number | null;
  orderIndex?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateSessionPlanItemInput {
  orderIndex?: number;
  goalId?: string;
  goalObjectiveId?: string;
  skillId?: string;
  activityType: string;
  activityDescription?: string;
  estimatedDurationMinutes?: number;
  aiMetadataJson?: Record<string, unknown>;
}

export interface CreateSessionPlanInput {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionTemplateName?: string;
  scheduledFor?: Date;
  estimatedDurationMinutes?: number;
  sessionType?: SessionPlanType;
  status?: SessionPlanStatus;
  metadataJson?: Record<string, unknown>;
  items?: CreateSessionPlanItemInput[];
}

export interface UpdateSessionPlanInput {
  sessionTemplateName?: string | null;
  scheduledFor?: Date | null;
  estimatedDurationMinutes?: number | null;
  sessionType?: SessionPlanType;
  status?: SessionPlanStatus;
  sessionId?: string | null;
  metadataJson?: Record<string, unknown> | null;
}

export interface SessionPlanFilters {
  tenantId: string;
  learnerId?: string;
  createdByUserId?: string;
  status?: SessionPlanStatus | SessionPlanStatus[];
  sessionType?: SessionPlanType | SessionPlanType[];
  scheduledFrom?: Date;
  scheduledTo?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS NOTE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateProgressNoteInput {
  tenantId: string;
  learnerId: string;
  createdByUserId: string;
  sessionId?: string;
  sessionPlanId?: string;
  goalId?: string;
  goalObjectiveId?: string;
  noteText: string;
  rating?: number;
  evidenceUri?: string;
}

export interface UpdateProgressNoteInput {
  sessionId?: string | null;
  sessionPlanId?: string | null;
  goalId?: string | null;
  goalObjectiveId?: string | null;
  noteText?: string;
  rating?: number | null;
  evidenceUri?: string | null;
}

export interface ProgressNoteFilters {
  tenantId: string;
  learnerId?: string;
  createdByUserId?: string;
  sessionId?: string;
  sessionPlanId?: string;
  goalId?: string;
  goalObjectiveId?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export interface GoalEvent {
  eventType: 'GOAL_CREATED' | 'GOAL_UPDATED' | 'GOAL_COMPLETED' | 'GOAL_ARCHIVED';
  tenantId: string;
  goalId: string;
  learnerId: string;
  createdByUserId: string;
  domain: GoalDomain;
  status: GoalStatus;
  timestamp: string;
}

export interface ObjectiveEvent {
  eventType: 'OBJECTIVE_CREATED' | 'OBJECTIVE_MET' | 'OBJECTIVE_UPDATED';
  tenantId: string;
  objectiveId: string;
  goalId: string;
  learnerId: string;
  status: ObjectiveStatus;
  timestamp: string;
}

export interface SessionPlanEvent {
  eventType: 'SESSION_PLAN_CREATED' | 'SESSION_PLAN_STARTED' | 'SESSION_PLAN_COMPLETED';
  tenantId: string;
  sessionPlanId: string;
  learnerId: string;
  createdByUserId: string;
  sessionType: SessionPlanType;
  timestamp: string;
}
