/**
 * API client for session-svc
 *
 * Handles live session management, including starting sessions from plans
 * and tracking session events.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SessionType = 'LEARNING' | 'THERAPY' | 'ASSESSMENT' | 'PRACTICE';
export type SessionOrigin = 'AI_PLATFORM' | 'TEACHER_LED' | 'SELF_PACED';
export type SessionEventType =
  | 'SESSION_STARTED'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'SESSION_ENDED'
  | 'ACTIVITY_STARTED'
  | 'ACTIVITY_COMPLETED'
  | 'ACTIVITY_SKIPPED'
  | 'NOTE_ADDED';

export interface Session {
  id: string;
  tenantId: string;
  learnerId: string;
  sessionType: SessionType;
  origin: SessionOrigin;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  metadataJson: SessionMetadata | null;
  createdAt: string;
  updatedAt: string;
  events?: SessionEvent[];
}

export interface SessionMetadata {
  sessionPlanId?: string;
  classroomId?: string;
  activityProgress?: ActivityProgress[];
  [key: string]: unknown;
}

export interface ActivityProgress {
  itemId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  tenantId: string;
  learnerId: string;
  eventType: SessionEventType;
  eventTime: string;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface SessionSummary {
  session: Session;
  events: SessionEvent[];
  durationMinutes: number;
  activitiesCompleted: number;
  activitiesTotal: number;
  notesAdded: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const SESSION_SVC_URL = process.env.NEXT_PUBLIC_SESSION_SVC_URL || '/api/sessions';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${SESSION_SVC_URL}${path}`;
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
// SESSION API
// ══════════════════════════════════════════════════════════════════════════════

export interface StartSessionFromPlanInput {
  learnerId: string;
  sessionPlanId: string;
}

/**
 * Start a new session from a session plan
 * Creates a session with TEACHER_LED origin and links to the plan
 */
export async function startSessionFromPlan(
  input: StartSessionFromPlanInput
): Promise<{ sessionId: string }> {
  return apiFetch<{ sessionId: string }>('/sessions/from-plan', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Fetch session by ID
 */
export async function fetchSession(sessionId: string): Promise<Session> {
  return apiFetch<Session>(`/sessions/${sessionId}`);
}

/**
 * Fetch session with all events
 */
export async function fetchSessionWithEvents(sessionId: string): Promise<Session> {
  return apiFetch<Session>(`/sessions/${sessionId}/with-events`);
}

export interface AddSessionEventInput {
  eventType: SessionEventType;
  metadataJson?: Record<string, unknown>;
}

/**
 * Add an event to a session
 */
export async function addSessionEvent(
  sessionId: string,
  input: AddSessionEventInput
): Promise<SessionEvent> {
  return apiFetch<SessionEvent>(`/sessions/${sessionId}/events`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface CompleteSessionInput {
  summary?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Complete/end a session
 */
export async function completeSession(
  sessionId: string,
  input?: CompleteSessionInput
): Promise<Session> {
  return apiFetch<Session>(`/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify(input ?? {}),
  });
}

/**
 * Get session summary with aggregated stats
 */
export async function getSessionSummary(sessionId: string): Promise<SessionSummary> {
  const session = await fetchSessionWithEvents(sessionId);
  
  const events = session.events ?? [];
  const activitiesCompleted = events.filter(e => e.eventType === 'ACTIVITY_COMPLETED').length;
  const notesAdded = events.filter(e => e.eventType === 'NOTE_ADDED').length;
  
  // Calculate total activities from metadata
  const activityProgress = (session.metadataJson as SessionMetadata | null)?.activityProgress ?? [];
  const activitiesTotal = activityProgress.length;
  
  // Calculate duration
  const durationMs = session.durationMs ?? (
    session.endedAt 
      ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
      : Date.now() - new Date(session.startedAt).getTime()
  );
  
  return {
    session,
    events,
    durationMinutes: Math.round(durationMs / 60000),
    activitiesCompleted,
    activitiesTotal,
    notesAdded,
  };
}
