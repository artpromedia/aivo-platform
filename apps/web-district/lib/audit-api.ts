/**
 * Audit API client for District Admin.
 *
 * Provides functions to fetch audit events from the analytics service.
 * Used by the learner audit timeline component.
 */

import type { AuthSession } from './auth';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type AuditActorType = 'USER' | 'SYSTEM' | 'AGENT';
export type AuditActionType = 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED';

export interface AuditEventSummary {
  id: string;
  actorType: AuditActorType;
  actorDisplayName: string | null;
  entityType: string;
  entityDisplayName: string | null;
  action: AuditActionType;
  summary: string;
  relatedExplanationId: string | null;
  createdAt: string;
}

export interface AuditEvent extends AuditEventSummary {
  tenantId: string;
  actorId: string | null;
  entityId: string;
  changeJson: Record<string, unknown>;
  reason: string | null;
  sessionId: string | null;
  learnerId: string | null;
}

export interface LearnerAuditResponse {
  learnerId: string;
  events: AuditEventSummary[];
  total: number;
}

export interface AuditEventDetailResponse {
  event: AuditEvent;
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3010';

/**
 * Get audit timeline for a specific learner.
 */
export async function getLearnerAudit(
  session: AuthSession,
  learnerId: string,
  options: {
    entityType?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<LearnerAuditResponse> {
  const params = new URLSearchParams();
  if (options.entityType) params.set('entityType', options.entityType);
  if (options.fromDate) params.set('fromDate', options.fromDate);
  if (options.toDate) params.set('toDate', options.toDate);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());

  const url = `${ANALYTICS_SERVICE_URL}/audit/learner/${learnerId}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch learner audit: ${response.status}`);
  }

  return response.json() as Promise<LearnerAuditResponse>;
}

/**
 * Get full details of a single audit event.
 */
export async function getAuditEventDetail(
  session: AuthSession,
  eventId: string
): Promise<AuditEventDetailResponse> {
  const url = `${ANALYTICS_SERVICE_URL}/audit/event/${eventId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch audit event: ${response.status}`);
  }

  return response.json() as Promise<AuditEventDetailResponse>;
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Actor type display configuration
 */
export const ACTOR_TYPE_DISPLAY: Record<AuditActorType, { label: string; icon: string }> = {
  USER: { label: 'User', icon: 'user' },
  SYSTEM: { label: 'System', icon: 'server' },
  AGENT: { label: 'AI Agent', icon: 'bot' },
};

/**
 * Action type display configuration
 */
export const ACTION_TYPE_DISPLAY: Record<AuditActionType, { label: string; colorClass: string }> = {
  CREATED: { label: 'Created', colorClass: 'bg-emerald-100 text-emerald-800' },
  UPDATED: { label: 'Updated', colorClass: 'bg-blue-100 text-blue-800' },
  DELETED: { label: 'Deleted', colorClass: 'bg-red-100 text-red-800' },
  ACTIVATED: { label: 'Activated', colorClass: 'bg-green-100 text-green-800' },
  DEACTIVATED: { label: 'Deactivated', colorClass: 'bg-amber-100 text-amber-800' },
};

/**
 * Entity type display configuration
 */
export const ENTITY_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  LEARNER_DIFFICULTY: { label: 'Difficulty Level', icon: 'gauge' },
  TODAY_PLAN: { label: 'Today Plan', icon: 'calendar' },
  POLICY_DOCUMENT: { label: 'Policy', icon: 'file-text' },
  LEARNER_PROFILE: { label: 'Learner Profile', icon: 'user' },
};

/**
 * Get display label for actor type.
 */
export function getActorTypeLabel(actorType: AuditActorType): string {
  return ACTOR_TYPE_DISPLAY[actorType]?.label ?? actorType;
}

/**
 * Get icon name for actor type.
 */
export function getActorTypeIcon(actorType: AuditActorType): string {
  return ACTOR_TYPE_DISPLAY[actorType]?.icon ?? 'help-circle';
}

/**
 * Get display label for action type.
 */
export function getActionTypeLabel(action: AuditActionType): string {
  return ACTION_TYPE_DISPLAY[action]?.label ?? action;
}

/**
 * Get color class for action type badge.
 */
export function getActionTypeColorClass(action: AuditActionType): string {
  return ACTION_TYPE_DISPLAY[action]?.colorClass ?? 'bg-slate-100 text-slate-800';
}

/**
 * Get display label for entity type.
 */
export function getEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_DISPLAY[entityType]?.label ?? entityType;
}

/**
 * Get icon name for entity type.
 */
export function getEntityTypeIcon(entityType: string): string {
  return ENTITY_TYPE_DISPLAY[entityType]?.icon ?? 'file';
}

/**
 * Format a date for display in the timeline.
 */
export function formatAuditDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format a date with time for detailed view.
 */
export function formatAuditDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get the last 7 days date range for default filter.
 */
export function getLast7DaysRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    fromDate: sevenDaysAgo.toISOString(),
    toDate: now.toISOString(),
  };
}
