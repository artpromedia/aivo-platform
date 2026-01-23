/**
 * Alerts API
 *
 * API client for platform alerts and notifications.
 * Connects to alert-svc for real-time alerting.
 */

import { apiClient, serviceUrls, buildQueryString, type PaginatedResponse } from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'silenced';
export type AlertCategory = 'health' | 'security' | 'billing' | 'license' | 'performance' | 'ai' | 'compliance' | 'system';

export interface PlatformAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  source: string;
  sourceId?: string;
  tenantId?: string;
  tenantName?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  silencedUntil?: string;
  metadata?: Record<string, unknown>;
  action?: {
    label: string;
    url: string;
  };
  relatedAlerts?: string[];
  occurrenceCount: number;
  lastOccurrence: string;
}

export interface AlertSummary {
  totalActive: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  acknowledgedCount: number;
  resolvedToday: number;
  avgResolutionTimeMinutes: number;
  topCategories: { category: AlertCategory; count: number }[];
}

export interface AlertFilters {
  severity?: AlertSeverity;
  status?: AlertStatus;
  category?: AlertCategory;
  tenantId?: string;
  source?: string;
  search?: string;
  since?: Date;
  until?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: AlertCategory;
  severity: AlertSeverity;
  conditions: {
    metric: string;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
    threshold: number;
    duration?: number; // seconds
  }[];
  notifications: {
    type: 'email' | 'slack' | 'pagerduty' | 'webhook';
    target: string;
    onlyOnEscalation?: boolean;
  }[];
  cooldownMinutes: number;
  autoResolve: boolean;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface AlertHistoryEntry {
  id: string;
  alertId: string;
  action: 'created' | 'acknowledged' | 'escalated' | 'resolved' | 'silenced' | 'reoccurred';
  timestamp: string;
  actor?: string;
  note?: string;
  previousStatus?: AlertStatus;
  newStatus?: AlertStatus;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch alert summary
 */
export async function getAlertSummary(
  accessToken: string
): Promise<AlertSummary> {
  return apiClient<AlertSummary>(
    serviceUrls.ALERT_SVC_URL,
    '/admin/alerts/summary',
    { accessToken, retries: 1 }
  );
}

/**
 * Fetch active alerts
 */
export async function listActiveAlerts(
  accessToken: string,
  filters?: AlertFilters
): Promise<PlatformAlert[]> {
  const query = buildQueryString({ ...filters, status: 'active' });
  return apiClient<PlatformAlert[]>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts${query}`,
    { accessToken, retries: 1 }
  );
}

/**
 * Fetch all alerts with pagination
 */
export async function listAlerts(
  accessToken: string,
  filters?: AlertFilters,
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<PlatformAlert>> {
  const queryParams: Record<string, unknown> = { ...filters, page, pageSize };
  if (filters?.since) {
    queryParams.since = filters.since.toISOString();
  }
  if (filters?.until) {
    queryParams.until = filters.until.toISOString();
  }
  const query = buildQueryString(queryParams);
  
  return apiClient<PaginatedResponse<PlatformAlert>>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts${query}`,
    { accessToken }
  );
}

/**
 * Fetch a single alert
 */
export async function getAlert(
  accessToken: string,
  alertId: string
): Promise<PlatformAlert> {
  return apiClient<PlatformAlert>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts/${alertId}`,
    { accessToken }
  );
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  accessToken: string,
  alertId: string,
  note?: string
): Promise<PlatformAlert> {
  return apiClient<PlatformAlert>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts/${alertId}/acknowledge`,
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({ note }),
    }
  );
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  accessToken: string,
  alertId: string,
  resolution?: string
): Promise<PlatformAlert> {
  return apiClient<PlatformAlert>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts/${alertId}/resolve`,
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({ resolution }),
    }
  );
}

/**
 * Silence an alert for a duration
 */
export async function silenceAlert(
  accessToken: string,
  alertId: string,
  durationMinutes: number,
  reason?: string
): Promise<PlatformAlert> {
  return apiClient<PlatformAlert>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts/${alertId}/silence`,
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({ durationMinutes, reason }),
    }
  );
}

/**
 * Fetch alert history
 */
export async function getAlertHistory(
  accessToken: string,
  alertId: string
): Promise<AlertHistoryEntry[]> {
  return apiClient<AlertHistoryEntry[]>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts/${alertId}/history`,
    { accessToken }
  );
}

/**
 * List alert rules
 */
export async function listAlertRules(
  accessToken: string
): Promise<AlertRule[]> {
  return apiClient<AlertRule[]>(
    serviceUrls.ALERT_SVC_URL,
    '/admin/alerts/rules',
    { accessToken }
  );
}

/**
 * Create an alert rule
 */
export async function createAlertRule(
  accessToken: string,
  rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'lastTriggered' | 'triggerCount'>
): Promise<AlertRule> {
  return apiClient<AlertRule>(
    serviceUrls.ALERT_SVC_URL,
    '/admin/alerts/rules',
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify(rule),
    }
  );
}

/**
 * Update an alert rule
 */
export async function updateAlertRule(
  accessToken: string,
  ruleId: string,
  updates: Partial<Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'lastTriggered' | 'triggerCount'>>
): Promise<AlertRule> {
  return apiClient<AlertRule>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts/rules/${ruleId}`,
    {
      accessToken,
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
}

/**
 * Delete an alert rule
 */
export async function deleteAlertRule(
  accessToken: string,
  ruleId: string
): Promise<void> {
  await apiClient<undefined>(
    serviceUrls.ALERT_SVC_URL,
    `/admin/alerts/rules/${ruleId}`,
    { accessToken, method: 'DELETE' }
  );
}

/**
 * Bulk acknowledge alerts
 */
export async function bulkAcknowledgeAlerts(
  accessToken: string,
  alertIds: string[],
  note?: string
): Promise<{ acknowledged: number; failed: number }> {
  return apiClient<{ acknowledged: number; failed: number }>(
    serviceUrls.ALERT_SVC_URL,
    '/admin/alerts/bulk/acknowledge',
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({ alertIds, note }),
    }
  );
}

/**
 * Bulk resolve alerts
 */
export async function bulkResolveAlerts(
  accessToken: string,
  alertIds: string[],
  resolution?: string
): Promise<{ resolved: number; failed: number }> {
  return apiClient<{ resolved: number; failed: number }>(
    serviceUrls.ALERT_SVC_URL,
    '/admin/alerts/bulk/resolve',
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({ alertIds, resolution }),
    }
  );
}
