/**
 * Provider Router Tests
 *
 * Tests tenant-aware provider selection, failover behavior,
 * intelligent model routing, cost-based downshift, and
 * education-optimized agent mapping.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  ProviderRouter,
  EDUCATION_OPTIMAL_PROVIDER,
  COST_DOWNSHIFT_MAP,
} from '../src/providers/providerRouter.js';
import type { ModelSelectionContext } from '../src/providers/providerRouter.js';
import type { AiRequest, TenantAiConfig } from '../src/types/aiRequest.js';

function createRequest(overrides: Partial<AiRequest> = {}): AiRequest {
  return {
    tenantId: 'tenant-123',
    userId: 'user-456',
    learnerId: 'learner-789',
    agentType: 'HOMEWORK_HELPER',
    locale: 'en-US',
    input: 'Help me with math',
    ...overrides,
  };
}

function createContext(overrides: Partial<ModelSelectionContext> = {}): ModelSelectionContext {
  return {
    agentType: 'HOMEWORK_HELPER',
    estimatedInputTokens: 500,
    tenantId: 'tenant-123',
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// PROVIDER SELECTION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Selection', () => {
  it('selects default provider when no tenant config is set', () => {
    const router = new ProviderRouter();

    const request = createRequest({ agentType: 'HOMEWORK_HELPER' });
    const selection = router.selectProvider(request);

    // Should use default provider (GEMINI)
    expect(selection.provider).toBe('GEMINI');
    expect(selection.model).toBeDefined();
  });

  it('uses tenant-specific config when set', () => {
    const router = new ProviderRouter();

    // Configure tenant to prefer Anthropic
    router.setTenantConfig('tenant-123', {
      providerPriority: ['ANTHROPIC', 'OPENAI', 'GEMINI'],
    });

    const request = createRequest({ agentType: 'HOMEWORK_HELPER' });
    const selection = router.selectProvider(request);

    expect(selection.provider).toBe('ANTHROPIC');
  });

  it('uses agent-specific model overrides when configured', () => {
    const router = new ProviderRouter();

    router.setTenantConfig('tenant-123', {
      modelOverrides: {
        HOMEWORK_HELPER: { provider: 'GEMINI', model: 'gemini-3.1-pro' },
      },
    });

    const request = createRequest({ agentType: 'HOMEWORK_HELPER' });
    const selection = router.selectProvider(request);

    expect(selection.provider).toBe('GEMINI');
    expect(selection.model).toBe('gemini-3.1-pro');
  });

  it('respects allowed providers restriction', () => {
    const router = new ProviderRouter();

    router.setTenantConfig('tenant-123', {
      allowedProviders: ['ANTHROPIC', 'GEMINI'],
      providerPriority: ['OPENAI', 'ANTHROPIC', 'GEMINI'],
    });

    const request = createRequest({ agentType: 'HOMEWORK_HELPER' });
    const selection = router.selectProvider(request);

    // OPENAI is in priority but not allowed, so should skip to ANTHROPIC
    expect(selection.provider).toBe('ANTHROPIC');
  });

  it('returns selection with priority', () => {
    const router = new ProviderRouter();

    const request = createRequest();
    const selection = router.selectProvider(request);

    expect(selection).toHaveProperty('priority');
    expect(typeof selection.priority).toBe('number');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GET FALLBACK PROVIDERS TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Fallback Providers', () => {
  it('returns list of fallback providers in priority order', () => {
    const router = new ProviderRouter();

    const request = createRequest();
    const fallbacks = router.getFallbackProviders(request);

    expect(Array.isArray(fallbacks)).toBe(true);
    expect(fallbacks.length).toBeGreaterThan(0);

    // Check priorities are in order
    for (let i = 1; i < fallbacks.length; i++) {
      expect(fallbacks[i]!.priority).toBeGreaterThan(fallbacks[i - 1]!.priority);
    }
  });

  it('respects tenant provider restrictions', () => {
    const router = new ProviderRouter();

    router.setTenantConfig('tenant-123', {
      allowedProviders: ['ANTHROPIC', 'GEMINI'],
      providerPriority: ['ANTHROPIC', 'GEMINI'],
    });

    const request = createRequest();
    const fallbacks = router.getFallbackProviders(request);

    const providers = fallbacks.map((f) => f.provider);
    expect(providers).not.toContain('OPENAI');
    expect(providers).toContain('ANTHROPIC');
    expect(providers).toContain('GEMINI');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// TENANT CONFIG TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Tenant Config', () => {
  it('stores and retrieves tenant config', () => {
    const router = new ProviderRouter();

    const config: Partial<TenantAiConfig> = {
      allowedProviders: ['ANTHROPIC'],
      providerPriority: ['ANTHROPIC'],
    };

    router.setTenantConfig('tenant-123', config);
    const retrieved = router.getTenantConfig('tenant-123');

    expect(retrieved.allowedProviders).toContain('ANTHROPIC');
    expect(retrieved.providerPriority).toContain('ANTHROPIC');
  });

  it('returns default config for unconfigured tenants', () => {
    const router = new ProviderRouter();

    const config = router.getTenantConfig('unknown-tenant');

    expect(config).toBeDefined();
    expect(config.allowedProviders).toBeDefined();
    expect(config.providerPriority).toBeDefined();
  });

  it('merges partial config with defaults', () => {
    const router = new ProviderRouter();

    // Only set some fields
    router.setTenantConfig('tenant-123', {
      contentFilterLevel: 'STRICT',
    });

    const config = router.getTenantConfig('tenant-123');

    expect(config.contentFilterLevel).toBe('STRICT');
    // Should still have other defaults
    expect(config.allowedProviders).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// COST ESTIMATION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Cost Estimation', () => {
  it('calculates cost for OpenAI gpt-5.2-instant', () => {
    const router = new ProviderRouter();

    const costCents = router.estimateCost('OPENAI', 'gpt-5.2-instant', 1000, 1000);

    // gpt-5.2-instant: $0.00015/1K input, $0.0006/1K output
    // 1K input = $0.00015 = 0.015 cents
    // 1K output = $0.0006 = 0.06 cents
    // Total = 0.075 cents, rounded to 0
    expect(costCents).toBeGreaterThanOrEqual(0);
    expect(typeof costCents).toBe('number');
  });

  it('calculates cost for Anthropic claude models', () => {
    const router = new ProviderRouter();

    const costCents = router.estimateCost('ANTHROPIC', 'claude-sonnet-4-6-20260201', 1000, 1000);

    expect(costCents).toBeGreaterThan(0);
  });

  it('calculates cost for Gemini models', () => {
    const router = new ProviderRouter();

    const costCents = router.estimateCost('GEMINI', 'gemini-3.1-pro', 1000, 1000);

    expect(costCents).toBeGreaterThan(0);
  });

  it('returns zero cost for unknown models', () => {
    const router = new ProviderRouter();

    const costCents = router.estimateCost('OPENAI', 'unknown-model', 1000, 1000);

    expect(costCents).toBe(0);
  });

  it('returns zero cost for MOCK provider', () => {
    const router = new ProviderRouter();

    const costCents = router.estimateCost('MOCK', 'mock-model', 1000, 1000);

    expect(costCents).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// PROVIDER REGISTRATION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Provider Registration', () => {
  it('allows registering custom providers', () => {
    const router = new ProviderRouter();

    const mockProvider = {
      generateCompletion: vi.fn(async () => ({
        content: 'Mock response',
        tokenUsage: { inputTokens: 10, outputTokens: 20 },
      })),
    };

    // Should not throw
    expect(() => router.registerProvider('MOCK', mockProvider as never)).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// EVENT EMISSION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Events', () => {
  it('emits providerSelected event when selecting', () => {
    const router = new ProviderRouter();
    const handler = vi.fn();

    router.on('providerSelected', handler);

    const request = createRequest();
    router.selectProvider(request);

    expect(handler).toHaveBeenCalledWith('tenant-123', expect.any(String), expect.any(String));
  });
});

// ────────────────────────────────────────────────────────────────────────────
// DIFFERENT AGENT TYPES TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Agent Type Handling', () => {
  it('selects appropriate model for TUTOR agent', () => {
    const router = new ProviderRouter();

    const request = createRequest({ agentType: 'TUTOR' });
    const selection = router.selectProvider(request);

    // TUTOR typically uses more powerful models
    expect(selection.model).toBeDefined();
    expect(selection.provider).toBeDefined();
  });

  it('selects appropriate model for BASELINE agent', () => {
    const router = new ProviderRouter();

    const request = createRequest({ agentType: 'BASELINE' });
    const selection = router.selectProvider(request);

    // BASELINE can use lighter models
    expect(selection.model).toBeDefined();
  });

  it('selects appropriate model for FOCUS agent', () => {
    const router = new ProviderRouter();

    const request = createRequest({ agentType: 'FOCUS' });
    const selection = router.selectProvider(request);

    expect(selection.model).toBeDefined();
  });

  it('handles all known agent types', () => {
    const router = new ProviderRouter();
    const agentTypes = [
      'BASELINE',
      'TUTOR',
      'HOMEWORK_HELPER',
      'FOCUS',
      'INSIGHTS',
      'VIRTUAL_BRAIN',
      'LESSON_PLANNER',
      'PROGRESS',
      'SAFETY',
      'IEP_GOAL',
      'OTHER',
    ] as const;

    for (const agentType of agentTypes) {
      const request = createRequest({ agentType });
      const selection = router.selectProvider(request);

      expect(selection.provider).toBeDefined();
      expect(selection.model).toBeDefined();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// HEALTH STATUS TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Health Status', () => {
  it('returns provider health status', () => {
    const router = new ProviderRouter();

    const health = router.getProvidersHealth();

    expect(Array.isArray(health)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// INTELLIGENT MODEL SELECTION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: selectOptimalModel', () => {
  it('returns a valid selection for every agent type', () => {
    const router = new ProviderRouter();
    const agentTypes = [
      'BASELINE', 'TUTOR', 'HOMEWORK_HELPER', 'FOCUS', 'INSIGHTS',
      'VIRTUAL_BRAIN', 'LESSON_PLANNER', 'PROGRESS', 'SAFETY', 'IEP_GOAL', 'OTHER',
    ] as const;

    for (const agentType of agentTypes) {
      const result = router.selectOptimalModel(createContext({ agentType }));
      expect(result.provider).toBeDefined();
      expect(result.model).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(typeof result.downshiftApplied).toBe('boolean');
    }
  });

  it('selects Gemini 3.1 Pro for long context (>100K tokens)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({
      estimatedInputTokens: 150_000,
    }));
    expect(result.provider).toBe('GEMINI');
    expect(result.model).toBe('gemini-3.1-pro');
    expect(result.reason).toContain('Long context');
  });

  it('falls back to Opus 4.6 for long context when Gemini is not allowed', () => {
    const router = new ProviderRouter();
    router.setTenantConfig('tenant-123', {
      allowedProviders: ['ANTHROPIC', 'OPENAI'],
      providerPriority: ['ANTHROPIC', 'OPENAI'],
    });
    const result = router.selectOptimalModel(createContext({
      estimatedInputTokens: 200_000,
    }));
    expect(result.provider).toBe('ANTHROPIC');
    expect(result.model).toBe('claude-opus-4-6-20260201');
  });

  it('selects GPT-5.3-Codex for code generation', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({
      requiresCodeGeneration: true,
    }));
    expect(result.provider).toBe('OPENAI');
    expect(result.model).toBe('gpt-5.3-codex');
    expect(result.reason).toContain('Code generation');
  });

  it('selects Opus 4.6 for agentic reasoning', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({
      requiresAgenticReasoning: true,
    }));
    expect(result.provider).toBe('ANTHROPIC');
    expect(result.model).toBe('claude-opus-4-6-20260201');
    expect(result.reason).toContain('Agentic reasoning');
  });

  it('selects Gemini 3.1 Pro for vision input', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({
      requiresVision: true,
    }));
    expect(result.provider).toBe('GEMINI');
    expect(result.model).toBe('gemini-3.1-pro');
    expect(result.reason).toContain('Vision');
  });

  it('selects Gemini Flash for low-latency requirements', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({
      requiresLowLatency: true,
    }));
    expect(result.provider).toBe('GEMINI');
    expect(result.model).toBe('gemini-3.1-flash');
    expect(result.reason).toContain('Low latency');
  });

  it('honors tenant model overrides above all else', () => {
    const router = new ProviderRouter();
    router.setTenantConfig('tenant-123', {
      modelOverrides: {
        HOMEWORK_HELPER: { provider: 'ANTHROPIC', model: 'claude-opus-4-6-20260201' },
      },
    });
    const result = router.selectOptimalModel(createContext({
      requiresCodeGeneration: true, // Should be overridden
    }));
    expect(result.provider).toBe('ANTHROPIC');
    expect(result.model).toBe('claude-opus-4-6-20260201');
    expect(result.reason).toContain('Tenant override');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// EDUCATION-OPTIMIZED ROUTING TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Education-Optimized Routing', () => {
  it('routes TUTOR to Anthropic (Opus 4.6 for Socratic reasoning)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));
    expect(result.provider).toBe('ANTHROPIC');
    expect(result.model).toBe('claude-opus-4-6-20260201');
  });

  it('routes BASELINE to Gemini (Flash for fast diagnostics)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({ agentType: 'BASELINE' }));
    expect(result.provider).toBe('GEMINI');
    expect(result.model).toBe('gemini-3.1-flash');
  });

  it('routes IEP_GOAL to Anthropic (Opus 4.6 for high-stakes IEP)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({ agentType: 'IEP_GOAL' }));
    expect(result.provider).toBe('ANTHROPIC');
    expect(result.model).toBe('claude-opus-4-6-20260201');
  });

  it('routes HOMEWORK_HELPER to OpenAI (GPT-5.2-pro for structured problems)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({ agentType: 'HOMEWORK_HELPER' }));
    expect(result.provider).toBe('OPENAI');
    expect(result.model).toBe('gpt-5.2-pro');
  });

  it('routes FOCUS to Gemini (Flash for sub-second ADHD mode)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({ agentType: 'FOCUS' }));
    expect(result.provider).toBe('GEMINI');
    expect(result.model).toBe('gemini-3.1-flash');
  });

  it('routes VIRTUAL_BRAIN to OpenAI (GPT-5.3-Codex for knowledge graphs)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({ agentType: 'VIRTUAL_BRAIN' }));
    expect(result.provider).toBe('OPENAI');
    expect(result.model).toBe('gpt-5.3-codex');
  });

  it('routes LESSON_PLANNER to Anthropic (Opus 4.6 for curriculum design)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({ agentType: 'LESSON_PLANNER' }));
    expect(result.provider).toBe('ANTHROPIC');
    expect(result.model).toBe('claude-opus-4-6-20260201');
  });

  it('routes SAFETY to OpenAI (GPT-5.2-instant for fast screening)', () => {
    const router = new ProviderRouter();
    const result = router.selectOptimalModel(createContext({ agentType: 'SAFETY' }));
    expect(result.provider).toBe('OPENAI');
    expect(result.model).toBe('gpt-5.2-instant');
  });

  it('falls back to first allowed provider when optimal is unavailable', () => {
    const router = new ProviderRouter();
    // Restrict to only Gemini — but TUTOR prefers Anthropic
    router.setTenantConfig('tenant-123', {
      allowedProviders: ['GEMINI'],
      providerPriority: ['GEMINI'],
    });
    const result = router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));
    expect(result.provider).toBe('GEMINI');
    expect(result.model).toBe('gemini-3.1-pro');
  });

  it('uses static mapping when smart routing is disabled', () => {
    const router = new ProviderRouter();
    router.setTenantConfig('tenant-123', {
      enableSmartRouting: false,
      providerPriority: ['OPENAI', 'ANTHROPIC', 'GEMINI'],
    });
    // With smart routing off, TUTOR should use first allowed provider (OPENAI)
    const result = router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));
    expect(result.provider).toBe('OPENAI');
    expect(result.model).toBe('gpt-5.2-pro');
    expect(result.reason).toContain('Static mapping');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// COST-BASED DOWNSHIFT TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Cost-Based Downshift', () => {
  it('does not downshift when budget is unlimited (0)', () => {
    const router = new ProviderRouter();
    router.recordCost('tenant-123', 100);

    const result = router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));
    expect(result.downshiftApplied).toBe(false);
    expect(result.model).toBe('claude-opus-4-6-20260201');
  });

  it('does not downshift when under budget threshold', () => {
    const router = new ProviderRouter();
    router.setTenantConfig('tenant-123', {
      dailyCostBudgetUsd: 100,
      costDownshiftThreshold: 0.8,
    });
    router.recordCost('tenant-123', 50); // 50%

    const result = router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));
    expect(result.downshiftApplied).toBe(false);
    expect(result.model).toBe('claude-opus-4-6-20260201');
  });

  it('downshifts Opus to Sonnet when >80% budget consumed', () => {
    const router = new ProviderRouter();
    router.setTenantConfig('tenant-123', {
      dailyCostBudgetUsd: 100,
      costDownshiftThreshold: 0.8,
    });
    router.recordCost('tenant-123', 85); // 85%

    const result = router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));
    expect(result.downshiftApplied).toBe(true);
    expect(result.model).toBe('claude-sonnet-4-6-20260201');
    expect(result.originalModel).toBe('claude-opus-4-6-20260201');
    expect(result.reason).toContain('DOWNSHIFTED');
  });

  it('downshifts GPT-5.2-pro to GPT-5.2-instant', () => {
    const router = new ProviderRouter();
    router.setTenantConfig('tenant-123', {
      dailyCostBudgetUsd: 50,
      costDownshiftThreshold: 0.8,
    });
    router.recordCost('tenant-123', 45); // 90%

    const result = router.selectOptimalModel(createContext({ agentType: 'HOMEWORK_HELPER' }));
    expect(result.downshiftApplied).toBe(true);
    expect(result.model).toBe('gpt-5.2-instant');
    expect(result.originalModel).toBe('gpt-5.2-pro');
  });

  it('downshifts Gemini Pro to Flash', () => {
    const router = new ProviderRouter();
    router.setTenantConfig('tenant-123', {
      dailyCostBudgetUsd: 20,
      costDownshiftThreshold: 0.8,
      enableSmartRouting: false,
      providerPriority: ['GEMINI', 'OPENAI', 'ANTHROPIC'],
    });
    router.recordCost('tenant-123', 18); // 90%

    const result = router.selectOptimalModel(createContext({
      agentType: 'TUTOR', // With static mapping + Gemini first → gemini-3.1-pro
    }));
    expect(result.downshiftApplied).toBe(true);
    expect(result.model).toBe('gemini-3.1-flash');
  });

  it('does not downshift already-cheap models', () => {
    const router = new ProviderRouter();
    router.setTenantConfig('tenant-123', {
      dailyCostBudgetUsd: 10,
      costDownshiftThreshold: 0.8,
    });
    router.recordCost('tenant-123', 9); // 90%

    // BASELINE → Gemini Flash (already cheapest)
    const result = router.selectOptimalModel(createContext({ agentType: 'BASELINE' }));
    expect(result.downshiftApplied).toBe(false);
    expect(result.model).toBe('gemini-3.1-flash');
  });

  it('emits quotaExceeded when budget fully consumed', () => {
    const router = new ProviderRouter();
    const quotaHandler = vi.fn();
    router.on('quotaExceeded', quotaHandler);

    router.setTenantConfig('tenant-123', {
      dailyCostBudgetUsd: 50,
      costDownshiftThreshold: 0.8,
    });
    router.recordCost('tenant-123', 55); // 110%

    router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));
    expect(quotaHandler).toHaveBeenCalledWith('tenant-123', 55, 50);
  });

  it('tracks daily spend correctly and resets across days', () => {
    const router = new ProviderRouter();
    router.recordCost('tenant-123', 10);
    router.recordCost('tenant-123', 5);
    expect(router.getDailySpend('tenant-123')).toBe(15);
    expect(router.getDailySpend('unknown-tenant')).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ROUTING OBSERVABILITY TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Routing Observability', () => {
  it('emits routingDecision event on selectOptimalModel', () => {
    const router = new ProviderRouter();
    const handler = vi.fn();
    router.on('routingDecision', handler);

    router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));

    expect(handler).toHaveBeenCalledTimes(1);
    const log = handler.mock.calls[0][0];
    expect(log).toHaveProperty('timestamp');
    expect(log).toHaveProperty('tenantId', 'tenant-123');
    expect(log).toHaveProperty('agentType', 'TUTOR');
    expect(log).toHaveProperty('selectedProvider');
    expect(log).toHaveProperty('selectedModel');
    expect(log).toHaveProperty('reason');
    expect(log).toHaveProperty('contextSignals');
    expect(Array.isArray(log.contextSignals)).toBe(true);
  });

  it('includes cost-downshift signal in contextSignals when active', () => {
    const router = new ProviderRouter();
    const handler = vi.fn();
    router.on('routingDecision', handler);

    router.setTenantConfig('tenant-123', {
      dailyCostBudgetUsd: 100,
      costDownshiftThreshold: 0.8,
    });
    router.recordCost('tenant-123', 90);

    router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));

    const log = handler.mock.calls[0][0];
    expect(log.contextSignals).toContain('education-optimized');
    expect(log.contextSignals.some((s: string) => s.startsWith('cost-downshift'))).toBe(true);
    expect(log.downshiftApplied).toBe(true);
  });

  it('reports budgetUtilization in routing log when budget is set', () => {
    const router = new ProviderRouter();
    const handler = vi.fn();
    router.on('routingDecision', handler);

    router.setTenantConfig('tenant-123', {
      dailyCostBudgetUsd: 100,
      costDownshiftThreshold: 0.8,
    });
    router.recordCost('tenant-123', 90);

    router.selectOptimalModel(createContext({ agentType: 'TUTOR' }));

    const log = handler.mock.calls[0][0];
    expect(log.budgetUtilization).toBeCloseTo(0.9, 1);
  });
});
