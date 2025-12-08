/**
 * Types for the Teacher Planning Service
 *
 * Extends types from goal-svc with API-specific types.
 */

// Re-export core domain types
export type {
  GoalDomain,
  GoalStatus,
  ObjectiveStatus,
  SessionPlanType,
  SessionPlanStatus,
  ProgressRating,
  Goal,
  GoalObjective,
  SessionPlan,
  SessionPlanItem,
  ProgressNote,
  GoalMetadata,
  SessionPlanMetadata,
  SessionPlanItemAiMetadata,
} from './domain.js';

// ══════════════════════════════════════════════════════════════════════════════
// JWT & AUTH TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type UserRole = 'PARENT' | 'LEARNER' | 'TEACHER' | 'THERAPIST' | 'DISTRICT_ADMIN' | 'PLATFORM_ADMIN' | 'SUPPORT';

/** JWT payload from auth-svc */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  tenantId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Authenticated user info extracted from JWT */
export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

// Extend Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// API REQUEST/RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Pagination params */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** API error response */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// GOAL API TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Request body for creating a goal */
export interface CreateGoalRequest {
  title: string;
  description?: string;
  domain: string;
  skillId?: string;
  startDate?: string; // ISO date
  targetDate?: string; // ISO date
  metadataJson?: Record<string, unknown>;
}

/** Request body for updating a goal */
export interface UpdateGoalRequest {
  title?: string;
  description?: string | null;
  status?: string;
  targetDate?: string | null;
  progressRating?: number | null;
  metadataJson?: Record<string, unknown> | null;
}

/** Request body for creating an objective */
export interface CreateObjectiveRequest {
  description: string;
  successCriteria?: string;
  orderIndex?: number;
}

/** Request body for updating an objective */
export interface UpdateObjectiveRequest {
  description?: string;
  successCriteria?: string | null;
  status?: string;
  progressRating?: number | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION PLAN API TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Request body for creating a session plan */
export interface CreateSessionPlanRequest {
  sessionType: string;
  scheduledFor?: string; // ISO datetime
  templateName?: string;
  goalIds?: string[];
  estimatedDurationMinutes?: number;
  metadataJson?: Record<string, unknown>;
}

/** Request body for updating a session plan */
export interface UpdateSessionPlanRequest {
  status?: string;
  scheduledFor?: string | null;
  templateName?: string | null;
  sessionId?: string | null;
  estimatedDurationMinutes?: number | null;
  metadataJson?: Record<string, unknown> | null;
}

/** Request body for creating/replacing session plan items */
export interface CreateSessionPlanItemRequest {
  orderIndex: number;
  goalId?: string;
  goalObjectiveId?: string;
  skillId?: string;
  activityType: string;
  activityDescription?: string;
  estimatedDurationMinutes?: number;
  aiMetadataJson?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS NOTE API TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Request body for creating a progress note */
export interface CreateProgressNoteRequest {
  learnerId: string;
  sessionId?: string;
  sessionPlanId?: string;
  goalId?: string;
  goalObjectiveId?: string;
  noteText: string;
  rating?: number;
  evidenceUri?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY FILTER TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Query params for listing goals */
export interface GoalQueryParams extends PaginationParams {
  status?: string;
  domain?: string;
}

/** Query params for listing session plans */
export interface SessionPlanQueryParams extends PaginationParams {
  status?: string;
  from?: string; // ISO datetime
  to?: string; // ISO datetime
}

/** Query params for listing progress notes */
export interface ProgressNoteQueryParams extends PaginationParams {
  goalId?: string;
  sessionId?: string;
}
