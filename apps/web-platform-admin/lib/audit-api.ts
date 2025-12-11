/**
 * Audit API Client for Platform Admin
 *
 * Functions for fetching audit events across all tenants.
 * Server-side only (uses internal service URLs).
 */

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const ANALYTICS_SVC_URL = process.env.ANALYTICS_SVC_URL ?? 'http://localhost:4020';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Actor types for audit events */
export type AuditActorType = 'USER' | 'SYSTEM' | 'AGENT';

/** Entity types tracked by audit events */
export type AuditEntityType = 'LEARNER_DIFFICULTY' | 'TODAY_PLAN' | 'POLICY_DOCUMENT';

/** Change JSON for policy changes */
export interface PolicyChangeJson {
  policyName?: string;
  policyVersion?: string;
  changedFields?: string[];
}

export interface PolicyAuditEvent {
  id: string;
  tenantId: string;
  tenantName?: string;
  actorType: AuditActorType;
  actorId: string;
  actorName?: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  changeJson: PolicyChangeJson;
  createdAt: string;
}

export interface PolicyAuditResponse {
  events: PolicyAuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  tenantId?: string;
  actorType?: AuditActorType;
  page?: number;
  pageSize?: number;
}

/** Generic audit event (for tenant-wide queries) */
export interface AuditEvent {
  id: string;
  tenantId: string;
  actorType: AuditActorType;
  actorId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  changeJson: Record<string, unknown>;
  relatedExplanationId: string | null;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// FETCH HELPER
// ══════════════════════════════════════════════════════════════════════════════

interface FetchOptions extends RequestInit {
  accessToken?: string;
}

async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  const url = `${ANALYTICS_SVC_URL}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
  };

  const res = await fetch(url, {
    ...(options ?? {}),
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({ message: res.statusText }))) as {
      message?: string;
    };
    throw new Error(errorData.message ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════════════════════
// POLICY AUDIT API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch policy document audit events across all tenants
 */
export async function getPolicyAuditLog(
  accessToken: string,
  filters?: AuditFilters
): Promise<PolicyAuditResponse> {
  const params = new URLSearchParams();
  
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.tenantId) params.append('tenantId', filters.tenantId);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  const path = `/audit/policies${queryString ? `?${queryString}` : ''}`;

  return apiFetch<PolicyAuditResponse>(path, { accessToken });
}

/**
 * Fetch audit events for a specific tenant
 */
export async function getTenantAuditLog(
  accessToken: string,
  tenantId: string,
  filters?: Omit<AuditFilters, 'tenantId'>
): Promise<{ events: AuditEvent[]; total: number }> {
  const params = new URLSearchParams();
  
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());

  const queryString = params.toString();
  const path = `/audit/tenant/${tenantId}${queryString ? `?${queryString}` : ''}`;

  return apiFetch<{ events: AuditEvent[]; total: number }>(path, { accessToken });
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Format a date for display
 */
export function formatAuditDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return formatAuditDate(dateString);
}

/**
 * Format policy change description
 */
export function formatPolicyChange(changeJson: PolicyChangeJson): string {
  const parts: string[] = [];
  
  if (changeJson.policyName) {
    parts.push(`Policy: ${changeJson.policyName}`);
  }
  
  if (changeJson.policyVersion) {
    parts.push(`Version: ${changeJson.policyVersion}`);
  }
  
  if (changeJson.changedFields && changeJson.changedFields.length > 0) {
    parts.push(`Changed: ${changeJson.changedFields.join(', ')}`);
  }
  
  return parts.join(' • ') || 'Policy document modified';
}

/**
 * Get human-readable action label
 */
export function getActionLabel(action: string): string {
  const actionLabels: Record<string, string> = {
    CREATED: 'Created',
    UPDATED: 'Updated',
    DELETED: 'Deleted',
    PUBLISHED: 'Published',
    ARCHIVED: 'Archived',
    ACTIVATED: 'Activated',
    DEACTIVATED: 'Deactivated',
  };
  
  return actionLabels[action] || action;
}

/**
 * Get action badge color
 */
export function getActionColor(action: string): string {
  const actionColors: Record<string, string> = {
    CREATED: 'bg-green-100 text-green-800',
    UPDATED: 'bg-blue-100 text-blue-800',
    DELETED: 'bg-red-100 text-red-800',
    PUBLISHED: 'bg-purple-100 text-purple-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
    ACTIVATED: 'bg-emerald-100 text-emerald-800',
    DEACTIVATED: 'bg-orange-100 text-orange-800',
  };
  
  return actionColors[action] || 'bg-slate-100 text-slate-800';
}

/**
 * Get actor type icon
 */
export function getActorIcon(actorType: AuditActorType): string {
  const icons: Record<AuditActorType, string> = {
    USER: '👤',
    SYSTEM: '⚙️',
    AGENT: '🤖',
  };
  
  return icons[actorType] || '❓';
}

/**
 * Get actor type label
 */
export function getActorTypeLabel(actorType: AuditActorType): string {
  const labels: Record<AuditActorType, string> = {
    USER: 'User',
    SYSTEM: 'System',
    AGENT: 'AI Agent',
  };
  
  return labels[actorType] || actorType;
}
