/**
 * Provider Registry
 *
 * Central registry for managing AI providers and their models.
 * Supports capability-based discovery, priority-based selection,
 * and dynamic model status updates.
 */

import { incrementCounter } from './metrics-helper.js';

// ============================================================================
// Type Definitions
// ============================================================================

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'cohere'
  | 'huggingface'
  | 'custom';

export type ModelStatus = 'available' | 'degraded' | 'unavailable' | 'deprecated' | 'unknown';

export interface ProviderCapabilities {
  chat: boolean;
  completion: boolean;
  embedding: boolean;
  imageGeneration: boolean;
  imageAnalysis: boolean;
  functionCalling: boolean;
  streaming: boolean;
  jsonMode: boolean;
  codeExecution: boolean;
}

export interface ModelCapabilities {
  chat: boolean;
  completion: boolean;
  embedding: boolean;
  imageGeneration: boolean;
  imageAnalysis: boolean;
  functionCalling: boolean;
  streaming: boolean;
  jsonMode: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay?: number;
  tokensPerDay?: number;
  concurrentRequests?: number;
}

export interface PricingConfig {
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  currency: 'USD';
  embeddingPer1kTokens?: number;
  imageGenerationPerImage?: number;
}

export interface HealthCheckConfig {
  endpoint?: string;
  intervalMs: number;
  timeoutMs: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface AIModel {
  id: string;
  providerId: string;
  name: string;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapabilities;
  pricing: PricingConfig;
  priority: number; // Lower = higher priority
  isEnabled: boolean;
  status: ModelStatus;
  tags?: string[];
  deprecationDate?: Date;
  replacedBy?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiVersion?: string;
  models: AIModel[];
  capabilities: ProviderCapabilities;
  rateLimits: RateLimitConfig;
  healthCheck: HealthCheckConfig;
  isEnabled: boolean;
  priority: number;
}

export interface ModelWithProvider {
  model: AIModel;
  provider: AIProvider;
}

// ============================================================================
// Provider Registry
// ============================================================================

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private modelIndex = new Map<string, AIModel>();
  private modelToProvider = new Map<string, string>();
  private capabilityIndex = new Map<keyof ModelCapabilities, Set<string>>();
  private statusUpdateCallbacks: ((modelId: string, status: ModelStatus) => void)[] = [];

  constructor() {
    // Initialize capability indexes
    const capabilities: (keyof ModelCapabilities)[] = [
      'chat',
      'completion',
      'embedding',
      'imageGeneration',
      'imageAnalysis',
      'functionCalling',
      'streaming',
      'jsonMode',
    ];

    for (const capability of capabilities) {
      this.capabilityIndex.set(capability, new Set());
    }
  }

  /**
   * Register a provider with all its models
   */
  registerProvider(provider: AIProvider): void {
    // Validate provider
    if (!provider.id || !provider.name) {
      throw new Error('Provider must have an id and name');
    }

    if (this.providers.has(provider.id)) {
      throw new Error(`Provider ${provider.id} is already registered`);
    }

    // Store provider
    this.providers.set(provider.id, provider);

    // Index all models
    for (const model of provider.models) {
      this.indexModel(model, provider.id);
    }

    incrementCounter('provider.registered', { provider: provider.id });
  }

  /**
   * Unregister a provider and all its models
   */
  unregisterProvider(providerId: string): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return false;
    }

    // Remove all model indexes
    for (const model of provider.models) {
      this.removeModelFromIndex(model.id);
    }

    this.providers.delete(providerId);
    incrementCounter('provider.unregistered', { provider: providerId });
    return true;
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get enabled providers sorted by priority
   */
  getEnabledProviders(): AIProvider[] {
    return Array.from(this.providers.values())
      .filter((p) => p.isEnabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get a model by ID
   */
  getModel(modelId: string): AIModel | undefined {
    return this.modelIndex.get(modelId);
  }

  /**
   * Get a model with its provider
   */
  getModelWithProvider(modelId: string): ModelWithProvider | undefined {
    const model = this.modelIndex.get(modelId);
    if (!model) return undefined;

    const providerId = this.modelToProvider.get(modelId);
    if (!providerId) return undefined;

    const provider = this.providers.get(providerId);
    if (!provider) return undefined;

    return { model, provider };
  }

  /**
   * Get all models that have a specific capability
   */
  getModelsForCapability(capability: keyof ModelCapabilities): AIModel[] {
    const modelIds = this.capabilityIndex.get(capability);
    if (!modelIds) return [];

    return Array.from(modelIds)
      .map((id) => this.modelIndex.get(id))
      .filter((model): model is AIModel => model !== undefined && model.isEnabled);
  }

  /**
   * Get models sorted by priority that have a specific capability
   */
  getModelsByPriority(capability: keyof ModelCapabilities): AIModel[] {
    return this.getModelsForCapability(capability)
      .filter((model) => model.status === 'available' || model.status === 'degraded')
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get models that meet specific requirements
   */
  getModelsMatchingRequirements(requirements: {
    capability: keyof ModelCapabilities;
    minContextWindow?: number;
    maxCostPerToken?: number;
    requireStreaming?: boolean;
    requireFunctionCalling?: boolean;
    requireJsonMode?: boolean;
    preferredProvider?: string;
    excludeProviders?: string[];
  }): AIModel[] {
    let models = this.getModelsByPriority(requirements.capability);

    if (requirements.minContextWindow) {
      models = models.filter((m) => m.contextWindow >= requirements.minContextWindow!);
    }

    if (requirements.maxCostPerToken) {
      models = models.filter((m) => m.pricing.inputPer1kTokens <= requirements.maxCostPerToken!);
    }

    if (requirements.requireStreaming) {
      models = models.filter((m) => m.capabilities.streaming);
    }

    if (requirements.requireFunctionCalling) {
      models = models.filter((m) => m.capabilities.functionCalling);
    }

    if (requirements.requireJsonMode) {
      models = models.filter((m) => m.capabilities.jsonMode);
    }

    if (requirements.excludeProviders?.length) {
      models = models.filter((m) => !requirements.excludeProviders!.includes(m.providerId));
    }

    // Sort with preferred provider first
    if (requirements.preferredProvider) {
      models = models.sort((a, b) => {
        if (a.providerId === requirements.preferredProvider) return -1;
        if (b.providerId === requirements.preferredProvider) return 1;
        return a.priority - b.priority;
      });
    }

    return models;
  }

  /**
   * Update the status of a model
   */
  updateModelStatus(modelId: string, status: ModelStatus): void {
    const model = this.modelIndex.get(modelId);
    if (!model) {
      return;
    }

    const previousStatus = model.status;
    model.status = status;

    if (previousStatus !== status) {
      incrementCounter('model.status_change', {
        model: modelId,
        from: previousStatus,
        to: status,
      });

      // Notify subscribers
      for (const callback of this.statusUpdateCallbacks) {
        try {
          callback(modelId, status);
        } catch (error) {
          console.error('Error in status update callback:', error);
        }
      }
    }
  }

  /**
   * Enable or disable a model
   */
  setModelEnabled(modelId: string, enabled: boolean): void {
    const model = this.modelIndex.get(modelId);
    if (model) {
      model.isEnabled = enabled;
      incrementCounter('model.enabled_change', {
        model: modelId,
        enabled: String(enabled),
      });
    }
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.isEnabled = enabled;
      incrementCounter('provider.enabled_change', {
        provider: providerId,
        enabled: String(enabled),
      });
    }
  }

  /**
   * Register a callback for model status updates
   */
  onModelStatusUpdate(callback: (modelId: string, status: ModelStatus) => void): () => void {
    this.statusUpdateCallbacks.push(callback);
    return () => {
      const index = this.statusUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalProviders: number;
    enabledProviders: number;
    totalModels: number;
    enabledModels: number;
    modelsByStatus: Record<ModelStatus, number>;
    modelsByCapability: Record<string, number>;
  } {
    const modelsByStatus: Record<ModelStatus, number> = {
      available: 0,
      degraded: 0,
      unavailable: 0,
      deprecated: 0,
      unknown: 0,
    };

    const modelsByCapability: Record<string, number> = {};

    for (const [capability, modelIds] of this.capabilityIndex) {
      modelsByCapability[capability] = modelIds.size;
    }

    let enabledModels = 0;
    for (const model of this.modelIndex.values()) {
      modelsByStatus[model.status]++;
      if (model.isEnabled) enabledModels++;
    }

    const enabledProviders = Array.from(this.providers.values()).filter((p) => p.isEnabled).length;

    return {
      totalProviders: this.providers.size,
      enabledProviders,
      totalModels: this.modelIndex.size,
      enabledModels,
      modelsByStatus,
      modelsByCapability,
    };
  }

  /**
   * Index a model for fast lookups
   */
  private indexModel(model: AIModel, providerId: string): void {
    // Ensure model has the provider ID
    model.providerId = providerId;

    // Store in main index
    this.modelIndex.set(model.id, model);
    this.modelToProvider.set(model.id, providerId);

    // Index by capabilities
    for (const [capability, hasCapability] of Object.entries(model.capabilities)) {
      if (hasCapability && this.capabilityIndex.has(capability as keyof ModelCapabilities)) {
        this.capabilityIndex.get(capability as keyof ModelCapabilities)!.add(model.id);
      }
    }
  }

  /**
   * Remove a model from all indexes
   */
  private removeModelFromIndex(modelId: string): void {
    this.modelIndex.delete(modelId);
    this.modelToProvider.delete(modelId);

    for (const modelIds of this.capabilityIndex.values()) {
      modelIds.delete(modelId);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry();
  }
  return registryInstance;
}

export function resetProviderRegistry(): void {
  registryInstance = null;
}
