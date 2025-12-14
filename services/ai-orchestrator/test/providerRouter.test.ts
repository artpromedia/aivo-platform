/**
 * Provider Router Tests
 *
 * Tests tenant-aware provider selection and failover behavior.
 */

import { describe, expect, it, vi } from 'vitest';

import { ProviderRouter } from '../src/providers/providerRouter.js';
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

// ────────────────────────────────────────────────────────────────────────────
// PROVIDER SELECTION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Provider Router: Selection', () => {
  it('selects default provider when no tenant config is set', () => {
    const router = new ProviderRouter();

    const request = createRequest({ agentType: 'HOMEWORK_HELPER' });
    const selection = router.selectProvider(request);

    // Should use default provider (OPENAI)
    expect(selection.provider).toBe('OPENAI');
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
        HOMEWORK_HELPER: { provider: 'GEMINI', model: 'gemini-1.5-pro' },
      },
    });

    const request = createRequest({ agentType: 'HOMEWORK_HELPER' });
    const selection = router.selectProvider(request);

    expect(selection.provider).toBe('GEMINI');
    expect(selection.model).toBe('gemini-1.5-pro');
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
  it('calculates cost for OpenAI gpt-4o-mini', () => {
    const router = new ProviderRouter();

    const costCents = router.estimateCost('OPENAI', 'gpt-4o-mini', 1000, 1000);

    // gpt-4o-mini: $0.00015/1K input, $0.0006/1K output
    // 1K input = $0.00015 = 0.015 cents
    // 1K output = $0.0006 = 0.06 cents
    // Total = 0.075 cents, rounded to 0
    expect(costCents).toBeGreaterThanOrEqual(0);
    expect(typeof costCents).toBe('number');
  });

  it('calculates cost for Anthropic claude models', () => {
    const router = new ProviderRouter();

    const costCents = router.estimateCost('ANTHROPIC', 'claude-3-5-sonnet-20241022', 1000, 1000);

    expect(costCents).toBeGreaterThan(0);
  });

  it('calculates cost for Gemini models', () => {
    const router = new ProviderRouter();

    const costCents = router.estimateCost('GEMINI', 'gemini-1.5-pro', 1000, 1000);

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
