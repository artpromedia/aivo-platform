/**
 * AI Orchestration API
 *
 * API client for AI provider management and orchestration.
 * Connects to ai-orchestrator for provider stats, costs, and failover.
 */

import { apiClient, serviceUrls, buildQueryString, type PaginatedResponse } from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ProviderStatus = 'active' | 'standby' | 'degraded' | 'offline' | 'maintenance';
export type ProviderId = 'anthropic' | 'openai' | 'google' | 'meta' | 'cohere' | 'azure';

export interface AIProvider {
  id: ProviderId;
  name: string;
  displayName: string;
  status: ProviderStatus;
  isPrimary: boolean;
  isEnabled: boolean;
  priority: number;
  models: AIProviderModel[];
  requestsToday: number;
  requestsThisMonth: number;
  costToday: number;
  costThisMonth: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  successRate: number;
  lastHealthCheck: string;
  lastError?: string;
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
  quotaUsed?: number;
  quotaLimit?: number;
}

export interface AIProviderModel {
  id: string;
  name: string;
  displayName: string;
  version: string;
  isEnabled: boolean;
  capabilities: string[];
  maxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  avgLatency: number;
  requestsToday: number;
  costToday: number;
}

export interface OrchestrationSummary {
  totalRequestsToday: number;
  totalRequestsThisMonth: number;
  totalCostToday: number;
  totalCostThisMonth: number;
  avgLatency: number;
  overallErrorRate: number;
  activeProviders: number;
  totalProviders: number;
  primaryProvider: ProviderId;
  failoverCount: number;
  costByProvider: { providerId: ProviderId; cost: number }[];
  requestsByProvider: { providerId: ProviderId; requests: number }[];
  latencyByProvider: { providerId: ProviderId; latency: number }[];
}

export interface ProviderMetrics {
  providerId: ProviderId;
  period: 'hour' | 'day' | 'week' | 'month';
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalCost: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  tokensIn: number;
  tokensOut: number;
  errorsByType: { type: string; count: number }[];
  dataPoints: ProviderMetricPoint[];
}

export interface ProviderMetricPoint {
  timestamp: string;
  requests: number;
  errors: number;
  latency: number;
  cost: number;
}

export interface FailoverEvent {
  id: string;
  timestamp: string;
  fromProvider: ProviderId;
  toProvider: ProviderId;
  reason: 'error_threshold' | 'latency_threshold' | 'rate_limit' | 'manual' | 'health_check' | 'cost_limit';
  triggeredBy: 'auto' | 'manual';
  triggeredByUser?: string;
  duration?: number;
  affectedRequests: number;
  recovered: boolean;
  recoveredAt?: string;
}

export interface ProviderConfig {
  providerId: ProviderId;
  enabled: boolean;
  priority: number;
  maxConcurrentRequests: number;
  timeoutMs: number;
  retryCount: number;
  rateLimitPerMinute?: number;
  costLimitPerDay?: number;
  costLimitPerMonth?: number;
  failoverThresholds: {
    errorRatePercent: number;
    latencyMs: number;
    consecutiveErrors: number;
  };
  enabledModels: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch orchestration summary
 */
export async function getOrchestrationSummary(
  accessToken: string
): Promise<OrchestrationSummary> {
  return apiClient<OrchestrationSummary>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    '/admin/orchestration/summary',
    { accessToken, retries: 1 }
  );
}

/**
 * Fetch all AI providers
 */
export async function listProviders(
  accessToken: string
): Promise<AIProvider[]> {
  return apiClient<AIProvider[]>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    '/admin/orchestration/providers',
    { accessToken, retries: 1 }
  );
}

/**
 * Fetch single provider details
 */
export async function getProvider(
  accessToken: string,
  providerId: ProviderId
): Promise<AIProvider> {
  return apiClient<AIProvider>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    `/admin/orchestration/providers/${providerId}`,
    { accessToken }
  );
}

/**
 * Fetch provider metrics
 */
export async function getProviderMetrics(
  accessToken: string,
  providerId: ProviderId,
  period: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<ProviderMetrics> {
  return apiClient<ProviderMetrics>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    `/admin/orchestration/providers/${providerId}/metrics?period=${period}`,
    { accessToken }
  );
}

/**
 * Switch primary provider (manual failover)
 */
export async function switchPrimaryProvider(
  accessToken: string,
  providerId: ProviderId,
  reason?: string
): Promise<{ success: boolean; previousPrimary: ProviderId }> {
  return apiClient<{ success: boolean; previousPrimary: ProviderId }>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    '/admin/orchestration/providers/switch-primary',
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({ providerId, reason }),
    }
  );
}

/**
 * Enable/disable a provider
 */
export async function toggleProvider(
  accessToken: string,
  providerId: ProviderId,
  enabled: boolean
): Promise<AIProvider> {
  return apiClient<AIProvider>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    `/admin/orchestration/providers/${providerId}/toggle`,
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }
  );
}

/**
 * Update provider configuration
 */
export async function updateProviderConfig(
  accessToken: string,
  providerId: ProviderId,
  config: Partial<ProviderConfig>
): Promise<ProviderConfig> {
  return apiClient<ProviderConfig>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    `/admin/orchestration/providers/${providerId}/config`,
    {
      accessToken,
      method: 'PATCH',
      body: JSON.stringify(config),
    }
  );
}

/**
 * Get provider configuration
 */
export async function getProviderConfig(
  accessToken: string,
  providerId: ProviderId
): Promise<ProviderConfig> {
  return apiClient<ProviderConfig>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    `/admin/orchestration/providers/${providerId}/config`,
    { accessToken }
  );
}

/**
 * List failover events
 */
export async function listFailoverEvents(
  accessToken: string,
  filters?: {
    providerId?: ProviderId;
    reason?: string;
    since?: Date;
  },
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<FailoverEvent>> {
  const queryParams: Record<string, unknown> = { ...filters, page, pageSize };
  if (filters?.since) {
    queryParams.since = filters.since.toISOString();
  }
  const query = buildQueryString(queryParams);
  
  return apiClient<PaginatedResponse<FailoverEvent>>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    `/admin/orchestration/failover-events${query}`,
    { accessToken }
  );
}

/**
 * Trigger a health check for a provider
 */
export async function triggerProviderHealthCheck(
  accessToken: string,
  providerId: ProviderId
): Promise<AIProvider> {
  return apiClient<AIProvider>(
    serviceUrls.AI_ORCHESTRATOR_URL,
    `/admin/orchestration/providers/${providerId}/health-check`,
    { accessToken, method: 'POST' }
  );
}

/**
 * Get cost breakdown by model
 */
export async function getCostBreakdown(
  accessToken: string,
  period: 'day' | 'week' | 'month' = 'month'
): Promise<{
  totalCost: number;
  byProvider: { providerId: ProviderId; cost: number; requests: number }[];
  byModel: { providerId: ProviderId; modelId: string; cost: number; requests: number }[];
  byTenant: { tenantId: string; tenantName: string; cost: number; requests: number }[];
}> {
  return apiClient(
    serviceUrls.AI_ORCHESTRATOR_URL,
    `/admin/orchestration/costs?period=${period}`,
    { accessToken }
  );
}
