/**
 * Priority Router
 *
 * Intelligent model selection based on:
 * - Required capabilities
 * - Circuit breaker status
 * - Priority ranking
 * - Cost constraints
 * - Latency requirements
 * - Rate limit availability
 * - Tenant-specific preferences
 */

import type { AIModel, ModelCapabilities } from '../providers/registry.js';
import { getProviderRegistry } from '../providers/registry.js';
import { getCircuitBreakerRegistry } from './circuit-breaker.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

// ============================================================================
// Types
// ============================================================================

export interface RoutingRequest {
  /** Required capability for the model */
  capability: keyof ModelCapabilities;
  /** Preferred provider (will be prioritized if available) */
  preferredProvider?: string;
  /** Preferred model (will be used if available and healthy) */
  preferredModel?: string;
  /** Maximum cost per 1k tokens (input + output) */
  maxCostPerRequest?: number;
  /** Maximum acceptable latency in ms */
  maxLatencyMs?: number;
  /** Whether streaming is required */
  requireStreaming?: boolean;
  /** Whether function calling is required */
  requireFunctionCalling?: boolean;
  /** Whether JSON mode is required */
  requireJsonMode?: boolean;
  /** Whether image analysis is required */
  requireVision?: boolean;
  /** Minimum context window size */
  minContextWindow?: number;
  /** Estimated input tokens (for cost calculation) */
  estimatedInputTokens?: number;
  /** Estimated output tokens (for cost calculation) */
  estimatedOutputTokens?: number;
  /** Tenant ID for tenant-specific preferences */
  tenantId: string;
  /** Providers to exclude from selection */
  excludeProviders?: string[];
  /** Models to exclude from selection */
  excludeModels?: string[];
  /** Custom scoring function */
  customScorer?: (model: AIModel) => number;
}

export interface RoutingResult {
  model: AIModel;
  score: number;
  reasons: string[];
  alternativeCount: number;
}

export interface TenantPreferences {
  preferredProvider?: string;
  preferredModels?: string[];
  excludeProviders?: string[];
  maxCostPerRequest?: number;
  allowedCapabilities?: (keyof ModelCapabilities)[];
}

// ============================================================================
// Scoring Weights
// ============================================================================

interface ScoringWeights {
  priority: number;
  cost: number;
  contextWindow: number;
  preferredProvider: number;
  preferredModel: number;
  circuitHealth: number;
  capabilities: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  priority: 10,
  cost: 5,
  contextWindow: 3,
  preferredProvider: 20,
  preferredModel: 50,
  circuitHealth: 15,
  capabilities: 8,
};

// ============================================================================
// Priority Router
// ============================================================================

export class PriorityRouter {
  private tenantPreferences = new Map<string, TenantPreferences>();
  private modelLatencyCache = new Map<string, number>();
  private weights: ScoringWeights;

  constructor(weights?: Partial<ScoringWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Select the best model based on the routing request
   */
  async selectModel(request: RoutingRequest): Promise<RoutingResult> {
    const startTime = Date.now();
    const registry = getProviderRegistry();
    const circuitRegistry = getCircuitBreakerRegistry();

    // Get tenant preferences
    const tenantPrefs = this.tenantPreferences.get(request.tenantId);

    // Merge request with tenant preferences
    const mergedRequest = this.mergeWithTenantPreferences(request, tenantPrefs);

    // Get all models with the required capability
    let candidates = registry.getModelsForCapability(mergedRequest.capability);

    // Apply filters
    candidates = this.applyFilters(candidates, mergedRequest, circuitRegistry);

    if (candidates.length === 0) {
      incrementCounter('router.no_candidates', {
        capability: request.capability,
        tenant_id: request.tenantId,
      });
      throw new NoAvailableModelError(
        `No available models found for capability: ${request.capability}`,
        request
      );
    }

    // Score and rank candidates
    const scoredCandidates = candidates.map((model) => ({
      model,
      score: this.scoreModel(model, mergedRequest, circuitRegistry),
      reasons: this.getScoreReasons(model, mergedRequest, circuitRegistry),
    }));

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    const selected = scoredCandidates[0]!;

    // Record metrics
    recordHistogram('router.selection_time_ms', Date.now() - startTime, {
      tenant_id: request.tenantId,
    });
    incrementCounter('router.model_selected', {
      provider: selected.model.providerId,
      model: selected.model.id,
      tenant_id: request.tenantId,
    });

    return {
      model: selected.model,
      score: selected.score,
      reasons: selected.reasons,
      alternativeCount: scoredCandidates.length - 1,
    };
  }

  /**
   * Get the next fallback model after the current one fails
   */
  async getNextFallback(
    currentModel: AIModel,
    request: RoutingRequest
  ): Promise<AIModel | null> {
    const registry = getProviderRegistry();
    const circuitRegistry = getCircuitBreakerRegistry();

    // Get tenant preferences
    const tenantPrefs = this.tenantPreferences.get(request.tenantId);
    const mergedRequest = this.mergeWithTenantPreferences(request, tenantPrefs);

    // Add current model to exclusion list
    const excludeModels = [...(mergedRequest.excludeModels ?? []), currentModel.id];

    // Get all models with the required capability
    let candidates = registry.getModelsForCapability(mergedRequest.capability);

    // Apply filters with updated exclusions
    candidates = this.applyFilters(
      candidates,
      { ...mergedRequest, excludeModels },
      circuitRegistry
    );

    if (candidates.length === 0) {
      incrementCounter('router.no_fallback', {
        current_model: currentModel.id,
        capability: request.capability,
        tenant_id: request.tenantId,
      });
      return null;
    }

    // Score and rank candidates
    const scoredCandidates = candidates.map((model) => ({
      model,
      score: this.scoreModel(model, mergedRequest, circuitRegistry),
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);

    const fallback = scoredCandidates[0]!.model;

    incrementCounter('router.fallback_selected', {
      from_model: currentModel.id,
      to_model: fallback.id,
      tenant_id: request.tenantId,
    });

    return fallback;
  }

  /**
   * Get all viable models for a request (useful for load balancing)
   */
  async getViableModels(request: RoutingRequest, limit?: number): Promise<RoutingResult[]> {
    const registry = getProviderRegistry();
    const circuitRegistry = getCircuitBreakerRegistry();

    const tenantPrefs = this.tenantPreferences.get(request.tenantId);
    const mergedRequest = this.mergeWithTenantPreferences(request, tenantPrefs);

    let candidates = registry.getModelsForCapability(mergedRequest.capability);
    candidates = this.applyFilters(candidates, mergedRequest, circuitRegistry);

    const scoredCandidates = candidates.map((model) => ({
      model,
      score: this.scoreModel(model, mergedRequest, circuitRegistry),
      reasons: this.getScoreReasons(model, mergedRequest, circuitRegistry),
      alternativeCount: 0,
    }));

    scoredCandidates.sort((a, b) => b.score - a.score);

    return limit ? scoredCandidates.slice(0, limit) : scoredCandidates;
  }

  /**
   * Set preferences for a tenant
   */
  setTenantPreferences(tenantId: string, preferences: TenantPreferences): void {
    this.tenantPreferences.set(tenantId, preferences);
  }

  /**
   * Get preferences for a tenant
   */
  getTenantPreferences(tenantId: string): TenantPreferences | undefined {
    return this.tenantPreferences.get(tenantId);
  }

  /**
   * Remove tenant preferences
   */
  clearTenantPreferences(tenantId: string): boolean {
    return this.tenantPreferences.delete(tenantId);
  }

  /**
   * Update model latency cache (from actual request data)
   */
  updateModelLatency(modelId: string, latencyMs: number): void {
    // Exponential moving average
    const currentLatency = this.modelLatencyCache.get(modelId) ?? latencyMs;
    const alpha = 0.2;
    this.modelLatencyCache.set(modelId, alpha * latencyMs + (1 - alpha) * currentLatency);
  }

  /**
   * Get estimated latency for a model
   */
  getEstimatedLatency(modelId: string): number | undefined {
    return this.modelLatencyCache.get(modelId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private mergeWithTenantPreferences(
    request: RoutingRequest,
    prefs?: TenantPreferences
  ): RoutingRequest {
    if (!prefs) return request;

    return {
      ...request,
      preferredProvider: request.preferredProvider ?? prefs.preferredProvider,
      excludeProviders: [
        ...(request.excludeProviders ?? []),
        ...(prefs.excludeProviders ?? []),
      ],
      maxCostPerRequest: request.maxCostPerRequest ?? prefs.maxCostPerRequest,
    };
  }

  private applyFilters(
    models: AIModel[],
    request: RoutingRequest,
    circuitRegistry: ReturnType<typeof getCircuitBreakerRegistry>
  ): AIModel[] {
    return models.filter((model) => {
      // Filter out disabled models
      if (!model.isEnabled) return false;

      // Filter out unavailable models
      if (model.status === 'unavailable') return false;

      // Filter by excluded providers
      if (request.excludeProviders?.includes(model.providerId)) return false;

      // Filter by excluded models
      if (request.excludeModels?.includes(model.id)) return false;

      // Filter by circuit breaker status
      const breaker = circuitRegistry.getBreaker(model.providerId, model.id);
      if (breaker.isOpen()) return false;

      // Filter by streaming requirement
      if (request.requireStreaming && !model.capabilities.streaming) return false;

      // Filter by function calling requirement
      if (request.requireFunctionCalling && !model.capabilities.functionCalling) return false;

      // Filter by JSON mode requirement
      if (request.requireJsonMode && !model.capabilities.jsonMode) return false;

      // Filter by vision requirement
      if (request.requireVision && !model.capabilities.imageAnalysis) return false;

      // Filter by context window
      if (request.minContextWindow && model.contextWindow < request.minContextWindow) {
        return false;
      }

      // Filter by cost
      if (request.maxCostPerRequest) {
        const inputTokens = request.estimatedInputTokens ?? 1000;
        const outputTokens = request.estimatedOutputTokens ?? 500;
        const estimatedCost =
          (inputTokens / 1000) * model.pricing.inputPer1kTokens +
          (outputTokens / 1000) * model.pricing.outputPer1kTokens;

        if (estimatedCost > request.maxCostPerRequest) return false;
      }

      // Filter by latency
      if (request.maxLatencyMs) {
        const estimatedLatency = this.modelLatencyCache.get(model.id);
        if (estimatedLatency && estimatedLatency > request.maxLatencyMs) return false;
      }

      return true;
    });
  }

  private scoreModel(
    model: AIModel,
    request: RoutingRequest,
    circuitRegistry: ReturnType<typeof getCircuitBreakerRegistry>
  ): number {
    let score = 0;

    // Priority score (lower priority = higher score)
    const maxPriority = 100;
    score += this.weights.priority * (maxPriority - model.priority) / maxPriority;

    // Cost score (lower cost = higher score)
    const inputTokens = request.estimatedInputTokens ?? 1000;
    const outputTokens = request.estimatedOutputTokens ?? 500;
    const estimatedCost =
      (inputTokens / 1000) * model.pricing.inputPer1kTokens +
      (outputTokens / 1000) * model.pricing.outputPer1kTokens;
    const maxCost = 0.1; // Normalize against $0.10 per request
    score += this.weights.cost * Math.max(0, 1 - estimatedCost / maxCost);

    // Context window score (larger = higher score)
    const maxContext = 200000;
    score += this.weights.contextWindow * Math.min(1, model.contextWindow / maxContext);

    // Preferred provider bonus
    if (request.preferredProvider === model.providerId) {
      score += this.weights.preferredProvider;
    }

    // Preferred model bonus
    if (request.preferredModel === model.id) {
      score += this.weights.preferredModel;
    }

    // Circuit breaker health score
    const breaker = circuitRegistry.getBreaker(model.providerId, model.id);
    const stats = breaker.getStats();
    score += this.weights.circuitHealth * (1 - stats.failureRate);

    // Extra capability scores
    if (model.capabilities.functionCalling) score += this.weights.capabilities * 0.3;
    if (model.capabilities.jsonMode) score += this.weights.capabilities * 0.2;
    if (model.capabilities.streaming) score += this.weights.capabilities * 0.2;
    if (model.capabilities.imageAnalysis) score += this.weights.capabilities * 0.3;

    // Custom scorer
    if (request.customScorer) {
      score += request.customScorer(model);
    }

    return score;
  }

  private getScoreReasons(
    model: AIModel,
    request: RoutingRequest,
    circuitRegistry: ReturnType<typeof getCircuitBreakerRegistry>
  ): string[] {
    const reasons: string[] = [];

    if (request.preferredModel === model.id) {
      reasons.push('Preferred model');
    } else if (request.preferredProvider === model.providerId) {
      reasons.push('Preferred provider');
    }

    reasons.push(`Priority: ${model.priority}`);

    const inputTokens = request.estimatedInputTokens ?? 1000;
    const outputTokens = request.estimatedOutputTokens ?? 500;
    const estimatedCost =
      (inputTokens / 1000) * model.pricing.inputPer1kTokens +
      (outputTokens / 1000) * model.pricing.outputPer1kTokens;
    reasons.push(`Est. cost: $${estimatedCost.toFixed(4)}`);

    const breaker = circuitRegistry.getBreaker(model.providerId, model.id);
    const stats = breaker.getStats();
    if (stats.failureRate > 0) {
      reasons.push(`Failure rate: ${(stats.failureRate * 100).toFixed(1)}%`);
    }

    return reasons;
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class NoAvailableModelError extends Error {
  constructor(
    message: string,
    public readonly request: RoutingRequest
  ) {
    super(message);
    this.name = 'NoAvailableModelError';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let routerInstance: PriorityRouter | null = null;

export function getPriorityRouter(weights?: Partial<ScoringWeights>): PriorityRouter {
  if (!routerInstance) {
    routerInstance = new PriorityRouter(weights);
  }
  return routerInstance;
}

export function resetPriorityRouter(): void {
  routerInstance = null;
}
