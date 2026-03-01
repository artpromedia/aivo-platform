/**
 * Multi-Provider AI Gateway Tests
 *
 * Comprehensive tests for:
 * - Provider registry
 * - Circuit breaker
 * - Priority router
 * - Failover handler
 * - Cost calculator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import {
  ProviderRegistry,
  getProviderRegistry,
  resetProviderRegistry,
  type AIProvider,
  type AIModel,
} from '../src/providers/registry.js';

import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  getCircuitBreakerRegistry,
  resetCircuitBreakerRegistry,
  CircuitBreakerOpenError,
} from '../src/routing/circuit-breaker.js';

import {
  PriorityRouter,
  getPriorityRouter,
  resetPriorityRouter,
  NoAvailableModelError,
} from '../src/routing/priority-router.js';

import {
  FailoverHandler,
  getFailoverHandler,
  resetFailoverHandler,
  FailoverExhaustedError,
} from '../src/routing/failover-handler.js';

import {
  CostCalculator,
  getCostCalculator,
  resetCostCalculator,
} from '../src/routing/cost-calculator.js';

import {
  RateLimitError,
  AuthenticationError,
  TimeoutError,
} from '../src/providers/adapters/base.adapter.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestModel(overrides: Partial<AIModel> = {}): AIModel {
  return {
    id: 'test-model',
    providerId: 'test-provider',
    name: 'test-model',
    displayName: 'Test Model',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.001,
      outputPer1kTokens: 0.002,
      currency: 'USD',
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    ...overrides,
  };
}

function createTestProvider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    id: 'test-provider',
    name: 'Test Provider',
    type: 'custom',
    baseUrl: 'https://api.test.com',
    models: [createTestModel()],
    capabilities: {
      chat: true,
      completion: true,
      embedding: true,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
      codeExecution: false,
    },
    rateLimits: {
      requestsPerMinute: 100,
      tokensPerMinute: 100000,
    },
    healthCheck: {
      intervalMs: 30000,
      timeoutMs: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    },
    isEnabled: true,
    priority: 1,
    ...overrides,
  };
}

// ============================================================================
// Provider Registry Tests
// ============================================================================

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    resetProviderRegistry();
    registry = getProviderRegistry();
  });

  describe('registerProvider', () => {
    it('should register a provider successfully', () => {
      const provider = createTestProvider();
      registry.registerProvider(provider);

      expect(registry.getProvider('test-provider')).toBeDefined();
      expect(registry.getProvider('test-provider')?.name).toBe('Test Provider');
    });

    it('should throw error when registering duplicate provider', () => {
      const provider = createTestProvider();
      registry.registerProvider(provider);

      expect(() => registry.registerProvider(provider)).toThrow(
        'Provider test-provider is already registered'
      );
    });

    it('should index models by capability', () => {
      const provider = createTestProvider();
      registry.registerProvider(provider);

      const chatModels = registry.getModelsForCapability('chat');
      expect(chatModels).toHaveLength(1);
      expect(chatModels[0]?.id).toBe('test-model');
    });
  });

  describe('getModelsMatchingRequirements', () => {
    beforeEach(() => {
      registry.registerProvider(createTestProvider({
        id: 'provider-1',
        models: [
          createTestModel({ id: 'model-1', providerId: 'provider-1', priority: 1, contextWindow: 4096 }),
          createTestModel({ id: 'model-2', providerId: 'provider-1', priority: 2, contextWindow: 32000 }),
        ],
      }));
      registry.registerProvider(createTestProvider({
        id: 'provider-2',
        models: [
          createTestModel({
            id: 'model-3',
            providerId: 'provider-2',
            priority: 3,
            capabilities: { ...createTestModel().capabilities, streaming: false },
          }),
        ],
      }));
    });

    it('should filter by minimum context window', () => {
      const models = registry.getModelsMatchingRequirements({
        capability: 'chat',
        minContextWindow: 10000,
      });

      expect(models).toHaveLength(1);
      expect(models[0]?.id).toBe('model-2');
    });

    it('should filter by streaming requirement', () => {
      const models = registry.getModelsMatchingRequirements({
        capability: 'chat',
        requireStreaming: true,
      });

      expect(models).toHaveLength(2);
      expect(models.every((m) => m.capabilities.streaming)).toBe(true);
    });

    it('should exclude specified providers', () => {
      const models = registry.getModelsMatchingRequirements({
        capability: 'chat',
        excludeProviders: ['provider-1'],
      });

      expect(models).toHaveLength(1);
      expect(models[0]?.providerId).toBe('provider-2');
    });

    it('should prioritize preferred provider', () => {
      const models = registry.getModelsMatchingRequirements({
        capability: 'chat',
        preferredProvider: 'provider-2',
      });

      expect(models[0]?.providerId).toBe('provider-2');
    });
  });

  describe('updateModelStatus', () => {
    it('should update model status', () => {
      registry.registerProvider(createTestProvider());

      registry.updateModelStatus('test-model', 'degraded');

      const model = registry.getModel('test-model');
      expect(model?.status).toBe('degraded');
    });

    it('should trigger status update callbacks', () => {
      registry.registerProvider(createTestProvider());
      const callback = vi.fn();
      registry.onModelStatusUpdate(callback);

      registry.updateModelStatus('test-model', 'unavailable');

      expect(callback).toHaveBeenCalledWith('test-model', 'unavailable');
    });
  });
});

// ============================================================================
// Circuit Breaker Tests
// ============================================================================

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-breaker', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      monitoringWindow: 60000,
    });
  });

  describe('state transitions', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.isAvailable()).toBe(true);
    });

    it('should transition to OPEN after failure threshold', () => {
      breaker.recordFailure(new Error('test error'));
      breaker.recordFailure(new Error('test error'));
      breaker.recordFailure(new Error('test error'));

      expect(breaker.getState()).toBe('OPEN');
      expect(breaker.isOpen()).toBe(true);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(new Error('test error'));
      }
      expect(breaker.getState()).toBe('OPEN');

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(breaker.getState()).toBe('HALF_OPEN');
    });

    it('should transition to CLOSED after success threshold in HALF_OPEN', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(new Error('test error'));
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Record successes
      breaker.recordSuccess();
      breaker.recordSuccess();

      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('execute', () => {
    it('should execute operation when closed', async () => {
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should throw CircuitBreakerOpenError when open', async () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(new Error('test error'));
      }

      await expect(breaker.execute(async () => 'success')).rejects.toThrow(
        CircuitBreakerOpenError
      );
    });

    it('should record success on successful execution', async () => {
      await breaker.execute(async () => 'success');

      const stats = breaker.getStats();
      expect(stats.successes).toBe(1);
    });

    it('should record failure and rethrow on failed execution', async () => {
      const error = new Error('test error');

      await expect(breaker.execute(async () => { throw error; })).rejects.toThrow('test error');

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    resetCircuitBreakerRegistry();
    registry = getCircuitBreakerRegistry();
  });

  it('should create breakers on demand', () => {
    const breaker = registry.getBreaker('provider1', 'model1');
    expect(breaker).toBeDefined();
    expect(breaker.getId()).toBe('provider1:model1');
  });

  it('should return same breaker for same provider/model', () => {
    const breaker1 = registry.getBreaker('provider1', 'model1');
    const breaker2 = registry.getBreaker('provider1', 'model1');
    expect(breaker1).toBe(breaker2);
  });

  it('should track healthy providers', () => {
    const breaker = registry.getBreaker('provider1', 'model1');

    expect(registry.getHealthyProviders()).toContain('provider1');

    // Open the circuit
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure(new Error('test'));
    }

    expect(registry.getHealthyProviders()).not.toContain('provider1');
  });
});

// ============================================================================
// Priority Router Tests
// ============================================================================

describe('PriorityRouter', () => {
  let router: PriorityRouter;
  let providerRegistry: ProviderRegistry;

  beforeEach(() => {
    resetProviderRegistry();
    resetCircuitBreakerRegistry();
    resetPriorityRouter();

    providerRegistry = getProviderRegistry();
    router = getPriorityRouter();

    // Register test providers
    providerRegistry.registerProvider(createTestProvider({
      id: 'provider-1',
      priority: 1,
      models: [
        createTestModel({
          id: 'model-1a',
          providerId: 'provider-1',
          priority: 1,
          pricing: { inputPer1kTokens: 0.001, outputPer1kTokens: 0.002, currency: 'USD' },
        }),
        createTestModel({
          id: 'model-1b',
          providerId: 'provider-1',
          priority: 2,
          pricing: { inputPer1kTokens: 0.002, outputPer1kTokens: 0.004, currency: 'USD' },
        }),
      ],
    }));

    providerRegistry.registerProvider(createTestProvider({
      id: 'provider-2',
      priority: 2,
      models: [
        createTestModel({
          id: 'model-2a',
          providerId: 'provider-2',
          priority: 3,
          pricing: { inputPer1kTokens: 0.0005, outputPer1kTokens: 0.001, currency: 'USD' },
        }),
      ],
    }));
  });

  describe('selectModel', () => {
    it('should select highest priority model by default', async () => {
      const result = await router.selectModel({
        capability: 'chat',
        tenantId: 'test-tenant',
      });

      expect(result.model.id).toBe('model-1a');
    });

    it('should respect preferred provider', async () => {
      const result = await router.selectModel({
        capability: 'chat',
        preferredProvider: 'provider-2',
        tenantId: 'test-tenant',
      });

      expect(result.model.providerId).toBe('provider-2');
    });

    it('should respect preferred model', async () => {
      const result = await router.selectModel({
        capability: 'chat',
        preferredModel: 'model-1b',
        tenantId: 'test-tenant',
      });

      expect(result.model.id).toBe('model-1b');
    });

    it('should skip unhealthy models', async () => {
      const circuitRegistry = getCircuitBreakerRegistry();
      const breaker = circuitRegistry.getBreaker('provider-1', 'model-1a');

      // Open the circuit for model-1a
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure(new Error('test'));
      }

      const result = await router.selectModel({
        capability: 'chat',
        tenantId: 'test-tenant',
      });

      expect(result.model.id).not.toBe('model-1a');
    });

    it('should throw NoAvailableModelError when no models available', async () => {
      // Disable all models
      providerRegistry.setModelEnabled('model-1a', false);
      providerRegistry.setModelEnabled('model-1b', false);
      providerRegistry.setModelEnabled('model-2a', false);

      await expect(router.selectModel({
        capability: 'chat',
        tenantId: 'test-tenant',
      })).rejects.toThrow(NoAvailableModelError);
    });
  });

  describe('getNextFallback', () => {
    it('should return next best model', async () => {
      const result = await router.selectModel({
        capability: 'chat',
        tenantId: 'test-tenant',
      });

      const fallback = await router.getNextFallback(result.model, {
        capability: 'chat',
        tenantId: 'test-tenant',
      });

      expect(fallback).not.toBeNull();
      expect(fallback?.id).not.toBe(result.model.id);
    });

    it('should return null when no fallback available', async () => {
      // Disable all but one model
      providerRegistry.setModelEnabled('model-1b', false);
      providerRegistry.setModelEnabled('model-2a', false);

      const result = await router.selectModel({
        capability: 'chat',
        tenantId: 'test-tenant',
      });

      const fallback = await router.getNextFallback(result.model, {
        capability: 'chat',
        tenantId: 'test-tenant',
      });

      expect(fallback).toBeNull();
    });
  });

  describe('tenant preferences', () => {
    it('should apply tenant preferences', async () => {
      router.setTenantPreferences('test-tenant', {
        preferredProvider: 'provider-2',
      });

      const result = await router.selectModel({
        capability: 'chat',
        tenantId: 'test-tenant',
      });

      expect(result.model.providerId).toBe('provider-2');
    });
  });
});

// ============================================================================
// Failover Handler Tests
// ============================================================================

describe('FailoverHandler', () => {
  let handler: FailoverHandler;
  let providerRegistry: ProviderRegistry;

  beforeEach(() => {
    resetProviderRegistry();
    resetCircuitBreakerRegistry();
    resetPriorityRouter();
    resetFailoverHandler();

    providerRegistry = getProviderRegistry();
    handler = getFailoverHandler({
      maxRetries: 2,
      retryDelayMs: 100,
      exponentialBackoff: false,
    });

    // Register test providers
    providerRegistry.registerProvider(createTestProvider({
      id: 'provider-1',
      models: [createTestModel({ id: 'model-1', providerId: 'provider-1', priority: 1 })],
    }));
    providerRegistry.registerProvider(createTestProvider({
      id: 'provider-2',
      models: [createTestModel({ id: 'model-2', providerId: 'provider-2', priority: 2 })],
    }));
  });

  describe('executeWithFailover', () => {
    it('should execute successfully on first attempt', async () => {
      const executor = vi.fn().mockResolvedValue('success');

      const result = await handler.executeWithFailover(
        { capability: 'chat', tenantId: 'test-tenant' },
        executor
      );

      expect(result.result).toBe('success');
      expect(result.failoverOccurred).toBe(false);
      expect(result.attemptedModels).toHaveLength(1);
    });

    it('should retry on retryable errors', async () => {
      const executor = vi.fn()
        .mockRejectedValueOnce(new Error('temporary error'))
        .mockResolvedValue('success');

      const result = await handler.executeWithFailover(
        { capability: 'chat', tenantId: 'test-tenant' },
        executor
      );

      expect(result.result).toBe('success');
      expect(result.retryCount).toBe(1);
      expect(executor).toHaveBeenCalledTimes(2);
    });

    it('should failover to next model after max retries', async () => {
      const executor = vi.fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockRejectedValueOnce(new Error('error 3'))
        .mockResolvedValue('success');

      const result = await handler.executeWithFailover(
        { capability: 'chat', tenantId: 'test-tenant' },
        executor
      );

      expect(result.result).toBe('success');
      expect(result.failoverOccurred).toBe(true);
      expect(result.attemptedModels.length).toBeGreaterThan(1);
    });

    it('should throw FailoverExhaustedError when all models fail', async () => {
      const executor = vi.fn().mockRejectedValue(new Error('always fails'));

      await expect(handler.executeWithFailover(
        { capability: 'chat', tenantId: 'test-tenant' },
        executor
      )).rejects.toThrow(FailoverExhaustedError);
    });
  });

  describe('classifyError', () => {
    it('should classify rate limit errors as failover', () => {
      expect(handler.classifyError(new RateLimitError('rate limit'))).toBe('failover');
    });

    it('should classify authentication errors as abort', () => {
      expect(handler.classifyError(new AuthenticationError('auth error'))).toBe('abort');
    });

    it('should classify timeout errors as retry', () => {
      expect(handler.classifyError(new TimeoutError('timeout', 1000))).toBe('retry');
    });
  });
});

// ============================================================================
// Cost Calculator Tests
// ============================================================================

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(() => {
    resetCostCalculator();
    calculator = getCostCalculator();
  });

  describe('estimateCost', () => {
    it('should calculate cost correctly', () => {
      const model = createTestModel({
        pricing: {
          inputPer1kTokens: 0.001,
          outputPer1kTokens: 0.002,
          currency: 'USD',
        },
      });

      const estimate = calculator.estimateCost(model, 1000, 500);

      expect(estimate.inputCost).toBe(0.001);
      expect(estimate.outputCost).toBe(0.001);
      expect(estimate.totalCost).toBe(0.002);
    });
  });

  describe('trackUsage', () => {
    it('should track usage records', () => {
      const model = createTestModel();

      const record = calculator.trackUsage('tenant-1', model, 1000, 500);

      expect(record.tenantId).toBe('tenant-1');
      expect(record.modelId).toBe('test-model');
      expect(record.inputTokens).toBe(1000);
      expect(record.outputTokens).toBe(500);
    });
  });

  describe('getTenantUsage', () => {
    it('should aggregate usage by tenant', () => {
      const model = createTestModel();

      calculator.trackUsage('tenant-1', model, 1000, 500);
      calculator.trackUsage('tenant-1', model, 2000, 1000);

      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const report = calculator.getTenantUsage('tenant-1', startDate, now);

      expect(report.totalRequests).toBe(2);
      expect(report.totalInputTokens).toBe(3000);
      expect(report.totalOutputTokens).toBe(1500);
    });
  });

  describe('budget management', () => {
    it('should track budget status', () => {
      const model = createTestModel({
        pricing: { inputPer1kTokens: 1, outputPer1kTokens: 2, currency: 'USD' },
      });

      calculator.setBudget({
        tenantId: 'tenant-1',
        dailyLimit: 10,
        monthlyLimit: 100,
        alertThreshold: 0.8,
      });

      calculator.trackUsage('tenant-1', model, 1000, 500);

      const status = calculator.getBudgetStatus('tenant-1');

      expect(status.dailyUsage).toBeGreaterThan(0);
      expect(status.dailyLimit).toBe(10);
    });

    it('should detect when budget is exceeded', () => {
      const model = createTestModel({
        pricing: { inputPer1kTokens: 10, outputPer1kTokens: 20, currency: 'USD' },
      });

      calculator.setBudget({
        tenantId: 'tenant-1',
        dailyLimit: 1,
      });

      calculator.trackUsage('tenant-1', model, 1000, 500);

      const isWithinBudget = calculator.isWithinBudget('tenant-1', 1);

      expect(isWithinBudget).toBe(false);
    });
  });

  describe('selectCheapestModel', () => {
    it('should select the cheapest model', () => {
      const models = [
        createTestModel({
          id: 'expensive',
          pricing: { inputPer1kTokens: 0.01, outputPer1kTokens: 0.02, currency: 'USD' },
        }),
        createTestModel({
          id: 'cheap',
          pricing: { inputPer1kTokens: 0.001, outputPer1kTokens: 0.002, currency: 'USD' },
        }),
        createTestModel({
          id: 'medium',
          pricing: { inputPer1kTokens: 0.005, outputPer1kTokens: 0.01, currency: 'USD' },
        }),
      ];

      const cheapest = calculator.selectCheapestModel(models, 1000, 500);

      expect(cheapest?.id).toBe('cheap');
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Multi-Provider Gateway Integration', () => {
  beforeEach(() => {
    resetProviderRegistry();
    resetCircuitBreakerRegistry();
    resetPriorityRouter();
    resetFailoverHandler();
    resetCostCalculator();
  });

  it('should complete full request lifecycle', async () => {
    const providerRegistry = getProviderRegistry();
    const router = getPriorityRouter();
    const handler = getFailoverHandler();
    const calculator = getCostCalculator();

    // Setup
    providerRegistry.registerProvider(createTestProvider({
      id: 'test-provider',
      models: [createTestModel({ id: 'test-model', providerId: 'test-provider' })],
    }));

    // Simulate request
    const routingRequest = {
      capability: 'chat' as const,
      tenantId: 'test-tenant',
    };

    // Select model
    const selection = await router.selectModel(routingRequest);
    expect(selection.model.id).toBe('test-model');

    // Execute with failover (simulating successful execution)
    const result = await handler.executeWithFailover(
      routingRequest,
      async (model) => {
        expect(model.id).toBe('test-model');
        return { success: true, model };
      }
    );

    expect(result.result).toEqual({ success: true, model: expect.any(Object) });
    expect(result.failoverOccurred).toBe(false);

    // Track cost
    calculator.trackUsage('test-tenant', selection.model, 100, 50);
    const usage = calculator.getDailyUsage('test-tenant');
    expect(usage).toBeGreaterThan(0);
  });

  it('should handle failover across providers', async () => {
    const providerRegistry = getProviderRegistry();
    const handler = getFailoverHandler({ maxRetries: 0 }); // No retries, immediate failover

    // Setup multiple providers
    providerRegistry.registerProvider(createTestProvider({
      id: 'primary',
      priority: 1,
      models: [createTestModel({ id: 'primary-model', providerId: 'primary', priority: 1 })],
    }));
    providerRegistry.registerProvider(createTestProvider({
      id: 'fallback',
      priority: 2,
      models: [createTestModel({ id: 'fallback-model', providerId: 'fallback', priority: 2 })],
    }));

    let attemptCount = 0;
    const result = await handler.executeWithFailover(
      { capability: 'chat', tenantId: 'test-tenant' },
      async (model) => {
        attemptCount++;
        if (model.id === 'primary-model') {
          throw new Error('primary failed');
        }
        return { model: model.id };
      }
    );

    expect(result.failoverOccurred).toBe(true);
    expect(result.finalModel.id).toBe('fallback-model');
    expect(attemptCount).toBe(2);
  });
});
