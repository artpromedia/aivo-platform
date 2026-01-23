/**
 * Health API
 *
 * API client for system health monitoring and service status.
 * Connects to health-aggregator service for real-time health data.
 */

import { apiClient, serviceUrls, buildQueryString, type PaginatedResponse } from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';
export type ServiceCategory = 'core' | 'ai' | 'integration' | 'infrastructure' | 'database';

export interface ServiceHealth {
  id: string;
  name: string;
  displayName: string;
  category: ServiceCategory;
  status: HealthStatus;
  latency: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  uptime: string;
  uptimePercent: number;
  lastCheck: string;
  lastDowntime?: string;
  errorRate: number;
  requestsPerMinute: number;
  version: string;
  region?: string;
  dependencies?: string[];
}

export interface HealthSummary {
  overallStatus: HealthStatus;
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  downServices: number;
  averageLatency: number;
  averageUptime: number;
  lastUpdated: string;
}

export interface HealthHistoryPoint {
  timestamp: string;
  status: HealthStatus;
  latency: number;
  errorRate: number;
  requestCount: number;
}

export interface ServiceHealthHistory {
  serviceId: string;
  serviceName: string;
  period: 'hour' | 'day' | 'week' | 'month';
  dataPoints: HealthHistoryPoint[];
  avgLatency: number;
  avgUptime: number;
  totalDowntime: number;
  incidents: HealthIncident[];
}

export interface HealthIncident {
  id: string;
  serviceId: string;
  serviceName: string;
  type: 'outage' | 'degradation' | 'latency_spike' | 'error_spike';
  severity: 'critical' | 'major' | 'minor';
  startedAt: string;
  resolvedAt?: string;
  duration?: number;
  impact: string;
  rootCause?: string;
  resolution?: string;
}

export interface ResourceMetrics {
  serviceId: string;
  cpu: {
    current: number;
    average: number;
    peak: number;
  };
  memory: {
    current: number;
    average: number;
    peak: number;
    limit: number;
  };
  connections: {
    current: number;
    max: number;
  };
  diskUsage?: {
    used: number;
    total: number;
    percent: number;
  };
}

export interface HealthFilters {
  category?: ServiceCategory;
  status?: HealthStatus;
  search?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch overall health summary
 */
export async function getHealthSummary(
  accessToken: string
): Promise<HealthSummary> {
  return apiClient<HealthSummary>(
    serviceUrls.HEALTH_AGGREGATOR_URL,
    '/admin/health/summary',
    { accessToken, retries: 1, timeout: 10000 }
  );
}

/**
 * Fetch all service health statuses
 */
export async function listServiceHealth(
  accessToken: string,
  filters?: HealthFilters
): Promise<ServiceHealth[]> {
  const query = buildQueryString((filters ?? {}) as Record<string, unknown>);
  return apiClient<ServiceHealth[]>(
    serviceUrls.HEALTH_AGGREGATOR_URL,
    `/admin/health/services${query}`,
    { accessToken, retries: 1, timeout: 15000 }
  );
}

/**
 * Fetch single service health details
 */
export async function getServiceHealth(
  accessToken: string,
  serviceId: string
): Promise<ServiceHealth> {
  return apiClient<ServiceHealth>(
    serviceUrls.HEALTH_AGGREGATOR_URL,
    `/admin/health/services/${serviceId}`,
    { accessToken }
  );
}

/**
 * Fetch service health history
 */
export async function getServiceHealthHistory(
  accessToken: string,
  serviceId: string,
  period: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<ServiceHealthHistory> {
  return apiClient<ServiceHealthHistory>(
    serviceUrls.HEALTH_AGGREGATOR_URL,
    `/admin/health/services/${serviceId}/history?period=${period}`,
    { accessToken, timeout: 20000 }
  );
}

/**
 * Fetch resource metrics for a service
 */
export async function getResourceMetrics(
  accessToken: string,
  serviceId: string
): Promise<ResourceMetrics> {
  return apiClient<ResourceMetrics>(
    serviceUrls.HEALTH_AGGREGATOR_URL,
    `/admin/health/services/${serviceId}/resources`,
    { accessToken }
  );
}

/**
 * Fetch recent health incidents
 */
export async function listHealthIncidents(
  accessToken: string,
  filters?: {
    serviceId?: string;
    severity?: 'critical' | 'major' | 'minor';
    resolved?: boolean;
    since?: Date;
  },
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<HealthIncident>> {
  const query = buildQueryString({ ...filters, page, pageSize });
  return apiClient<PaginatedResponse<HealthIncident>>(
    serviceUrls.HEALTH_AGGREGATOR_URL,
    `/admin/health/incidents${query}`,
    { accessToken }
  );
}

/**
 * Trigger a manual health check for a service
 */
export async function triggerHealthCheck(
  accessToken: string,
  serviceId: string
): Promise<ServiceHealth> {
  return apiClient<ServiceHealth>(
    serviceUrls.HEALTH_AGGREGATOR_URL,
    `/admin/health/services/${serviceId}/check`,
    { accessToken, method: 'POST' }
  );
}
