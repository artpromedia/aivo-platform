/**
 * Audit API
 *
 * API client for audit log management and compliance reporting.
 * Connects to audit-svc for real audit events.
 */

import { apiClient, serviceUrls, buildQueryString, type PaginatedResponse } from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type AuditCategory = 'auth' | 'data' | 'config' | 'admin' | 'api' | 'security' | 'billing' | 'ai';
export type AuditStatus = 'success' | 'failure' | 'warning' | 'pending';
export type ActorRole = 'platform_admin' | 'tenant_admin' | 'teacher' | 'parent' | 'learner' | 'system' | 'api_service' | 'anonymous';

export interface AuditActor {
  id: string;
  name: string;
  email?: string;
  role: ActorRole;
  tenantId?: string;
  tenantName?: string;
  sessionId?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: string;
  actionDisplayName: string;
  category: AuditCategory;
  resource: string;
  resourceType: string;
  resourceId?: string;
  details: string;
  detailsJson?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  status: AuditStatus;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  correlationId?: string;
  parentEventId?: string;
}

export interface AuditLogSummary {
  totalEvents: number;
  eventsToday: number;
  eventsThisWeek: number;
  successCount: number;
  failureCount: number;
  warningCount: number;
  securityEventsCount: number;
  topActions: { action: string; count: number }[];
  topActors: { actorId: string; actorName: string; count: number }[];
  eventsByCategory: { category: AuditCategory; count: number }[];
  eventsByHour: { hour: string; count: number }[];
}

export interface AuditFilters {
  category?: AuditCategory;
  status?: AuditStatus;
  actorId?: string;
  actorRole?: ActorRole;
  tenantId?: string;
  action?: string;
  resourceType?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

export interface AuditExportRequest {
  format: 'csv' | 'json' | 'pdf';
  filters?: AuditFilters;
  columns?: string[];
  includeDetails?: boolean;
}

export interface AuditExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  recordCount?: number;
}

export interface AuditAlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    category?: AuditCategory;
    action?: string;
    status?: AuditStatus;
    threshold?: number;
    timeWindowMinutes?: number;
  };
  actions: {
    type: 'email' | 'slack' | 'webhook';
    target: string;
  }[];
  createdAt: string;
  lastTriggered?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch audit log summary/statistics
 */
export async function getAuditSummary(
  accessToken: string,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<AuditLogSummary> {
  return apiClient<AuditLogSummary>(
    serviceUrls.TENANT_SVC_URL, // Audit is part of tenant service
    `/admin/audit/summary?period=${period}`,
    { accessToken }
  );
}

/**
 * Fetch paginated audit logs
 */
export async function listAuditLogs(
  accessToken: string,
  filters?: AuditFilters,
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<AuditLogEntry>> {
  const queryParams: Record<string, unknown> = { ...filters, page, pageSize };
  if (filters?.startDate) {
    queryParams.startDate = filters.startDate.toISOString();
  }
  if (filters?.endDate) {
    queryParams.endDate = filters.endDate.toISOString();
  }
  const query = buildQueryString(queryParams);
  
  return apiClient<PaginatedResponse<AuditLogEntry>>(
    serviceUrls.TENANT_SVC_URL,
    `/admin/audit/logs${query}`,
    { accessToken, retries: 1 }
  );
}

/**
 * Fetch a single audit log entry with full details
 */
export async function getAuditLogEntry(
  accessToken: string,
  logId: string
): Promise<AuditLogEntry> {
  return apiClient<AuditLogEntry>(
    serviceUrls.TENANT_SVC_URL,
    `/admin/audit/logs/${logId}`,
    { accessToken }
  );
}

/**
 * Fetch related audit events (same correlation ID or resource)
 */
export async function getRelatedAuditEvents(
  accessToken: string,
  logId: string
): Promise<AuditLogEntry[]> {
  return apiClient<AuditLogEntry[]>(
    serviceUrls.TENANT_SVC_URL,
    `/admin/audit/logs/${logId}/related`,
    { accessToken }
  );
}

/**
 * Export audit logs
 */
export async function exportAuditLogs(
  accessToken: string,
  request: AuditExportRequest
): Promise<AuditExportResponse> {
  return apiClient<AuditExportResponse>(
    serviceUrls.TENANT_SVC_URL,
    '/admin/audit/export',
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

/**
 * Check export status
 */
export async function getAuditExportStatus(
  accessToken: string,
  exportId: string
): Promise<AuditExportResponse> {
  return apiClient<AuditExportResponse>(
    serviceUrls.TENANT_SVC_URL,
    `/admin/audit/export/${exportId}`,
    { accessToken }
  );
}

/**
 * List audit alert rules
 */
export async function listAuditAlertRules(
  accessToken: string
): Promise<AuditAlertRule[]> {
  return apiClient<AuditAlertRule[]>(
    serviceUrls.TENANT_SVC_URL,
    '/admin/audit/alerts',
    { accessToken }
  );
}

/**
 * Create an audit alert rule
 */
export async function createAuditAlertRule(
  accessToken: string,
  rule: Omit<AuditAlertRule, 'id' | 'createdAt' | 'lastTriggered'>
): Promise<AuditAlertRule> {
  return apiClient<AuditAlertRule>(
    serviceUrls.TENANT_SVC_URL,
    '/admin/audit/alerts',
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify(rule),
    }
  );
}

/**
 * Update an audit alert rule
 */
export async function updateAuditAlertRule(
  accessToken: string,
  ruleId: string,
  updates: Partial<Omit<AuditAlertRule, 'id' | 'createdAt' | 'lastTriggered'>>
): Promise<AuditAlertRule> {
  return apiClient<AuditAlertRule>(
    serviceUrls.TENANT_SVC_URL,
    `/admin/audit/alerts/${ruleId}`,
    {
      accessToken,
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
}

/**
 * Delete an audit alert rule
 */
export async function deleteAuditAlertRule(
  accessToken: string,
  ruleId: string
): Promise<void> {
  await apiClient<undefined>(
    serviceUrls.TENANT_SVC_URL,
    `/admin/audit/alerts/${ruleId}`,
    { accessToken, method: 'DELETE' }
  );
}
