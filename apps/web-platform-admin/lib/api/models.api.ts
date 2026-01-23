/**
 * AI Models API
 *
 * API client for AI model registry and management.
 * Fetches deployed models, versions, metrics, and performance stats.
 */

import { apiClient, serviceUrls, buildQueryString, type ApiClientOptions, type PaginatedResponse } from './client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ModelType = 'tutor' | 'assessment' | 'iep' | 'content' | 'translation' | 'embedding' | 'speech';
export type ModelStatus = 'active' | 'training' | 'deprecated' | 'testing' | 'pending';
export type ModelProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'META' | 'INTERNAL';

export interface AIModel {
  id: string;
  modelKey: string;
  name: string;
  displayName: string;
  version: string;
  type: ModelType;
  provider: ModelProvider;
  status: ModelStatus;
  tenantsUsing: number;
  parameters: string;
  description: string;
  capabilities: string[];
  limitations: string[];
  safetyRating: number;
  costPerRequest: number;
  avgLatencyMs: number;
  lastUpdated: string;
  deployedAt: string;
  createdBy: string;
}

export interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  status: ModelStatus;
  releaseNotes: string;
  createdAt: string;
  deployedAt?: string;
  deprecatedAt?: string;
  metrics: ModelVersionMetrics;
}

export interface ModelVersionMetrics {
  accuracy: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number;
  totalRequests: number;
}

export interface ModelMetrics {
  modelId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  costTotal: number;
  tokensIn: number;
  tokensOut: number;
  accuracy?: number;
  safetyFlags: number;
  userSatisfactionScore?: number;
  dataPoints: MetricDataPoint[];
}

export interface MetricDataPoint {
  timestamp: string;
  requests: number;
  latency: number;
  errors: number;
  cost: number;
}

export interface ModelSummaryMetrics {
  totalModels: number;
  activeModels: number;
  modelsInTraining: number;
  deprecatedModels: number;
  averageAccuracy: number;
  totalInferences: number;
  totalCost: number;
  avgLatencyMs: number;
}

export interface ModelDeploymentRequest {
  modelKey: string;
  version: string;
  targetEnvironment: 'staging' | 'production';
  rolloutPercentage?: number;
  tenantIds?: string[];
}

export interface ModelFilters {
  type?: ModelType;
  status?: ModelStatus;
  provider?: ModelProvider;
  search?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all deployed AI models
 */
export async function listModels(
  accessToken: string,
  filters?: ModelFilters,
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<AIModel>> {
  const query = buildQueryString({ ...filters, page, pageSize });
  return apiClient<PaginatedResponse<AIModel>>(
    serviceUrls.MODEL_REGISTRY_URL,
    `/admin/models${query}`,
    { accessToken, retries: 2 }
  );
}

/**
 * Fetch a single model by ID
 */
export async function getModel(
  accessToken: string,
  modelId: string
): Promise<AIModel> {
  return apiClient<AIModel>(
    serviceUrls.MODEL_REGISTRY_URL,
    `/admin/models/${modelId}`,
    { accessToken }
  );
}

/**
 * Fetch model versions
 */
export async function getModelVersions(
  accessToken: string,
  modelId: string
): Promise<ModelVersion[]> {
  return apiClient<ModelVersion[]>(
    serviceUrls.MODEL_REGISTRY_URL,
    `/admin/models/${modelId}/versions`,
    { accessToken }
  );
}

/**
 * Fetch model metrics
 */
export async function getModelMetrics(
  accessToken: string,
  modelId: string,
  period: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<ModelMetrics> {
  return apiClient<ModelMetrics>(
    serviceUrls.MODEL_REGISTRY_URL,
    `/admin/models/${modelId}/metrics?period=${period}`,
    { accessToken }
  );
}

/**
 * Fetch summary metrics for all models
 */
export async function getModelSummaryMetrics(
  accessToken: string
): Promise<ModelSummaryMetrics> {
  return apiClient<ModelSummaryMetrics>(
    serviceUrls.MODEL_REGISTRY_URL,
    '/admin/models/summary',
    { accessToken, retries: 1 }
  );
}

/**
 * Deploy a model version
 */
export async function deployModel(
  accessToken: string,
  request: ModelDeploymentRequest
): Promise<{ deploymentId: string; status: string }> {
  return apiClient<{ deploymentId: string; status: string }>(
    serviceUrls.MODEL_REGISTRY_URL,
    '/admin/models/deploy',
    {
      method: 'POST',
      body: JSON.stringify(request),
      accessToken,
    }
  );
}

/**
 * Deprecate a model
 */
export async function deprecateModel(
  accessToken: string,
  modelId: string,
  reason: string
): Promise<AIModel> {
  return apiClient<AIModel>(
    serviceUrls.MODEL_REGISTRY_URL,
    `/admin/models/${modelId}/deprecate`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
      accessToken,
    }
  );
}

/**
 * Get tenants using a specific model
 */
export async function getModelTenants(
  accessToken: string,
  modelId: string
): Promise<{ tenantId: string; tenantName: string; usageCount: number }[]> {
  return apiClient<{ tenantId: string; tenantName: string; usageCount: number }[]>(
    serviceUrls.MODEL_REGISTRY_URL,
    `/admin/models/${modelId}/tenants`,
    { accessToken }
  );
}
