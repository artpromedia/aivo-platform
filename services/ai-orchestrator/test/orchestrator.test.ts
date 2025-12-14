/**
 * Orchestrator Pipeline Tests
 *
 * Tests the complete AI orchestration flow including:
 * - Pre-filter → Provider selection → LLM call → Post-filter → Response
 * - Integration of all safety components
 * - Error handling and failover
 */

import { describe, expect, it, vi } from 'vitest';

import { orchestrateAiRequest } from '../src/pipeline/orchestrator.js';
import type { AiRequest } from '../src/types/aiRequest.js';
import { ProviderRouter } from '../src/providers/providerRouter.js';

function createRequest(overrides: Partial<AiRequest> = {}): AiRequest {
  return {
    tenantId: 'tenant-123',
    userId: 'user-456',
    learnerId: 'learner-789',
    agentType: 'HOMEWORK_HELPER',
    locale: 'en-US',
    input: 'Help me understand photosynthesis',
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// HAPPY PATH TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Orchestrator: Happy Path', () => {
  it('returns a response with required fields', async () => {
    const request = createRequest();
    const mockRouter = new ProviderRouter();

    // Register a mock provider that will be used
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(async () => ({
        content: 'Photosynthesis is the process by which plants convert sunlight into energy.',
        tokenUsage: { inputTokens: 50, outputTokens: 100 },
      })),
    } as never);

    // Set tenant to use MOCK provider
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    expect(response).toHaveProperty('output');
    expect(response).toHaveProperty('provider');
    expect(response).toHaveProperty('safetyActions');
    expect(response).toHaveProperty('latencyMs');
  });

  it('includes request ID in response', async () => {
    const request = createRequest({
      correlationId: 'test-correlation-123',
    });

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(async () => ({
        content: 'Test response',
        tokenUsage: { inputTokens: 10, outputTokens: 20 },
      })),
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    expect(response.requestId).toBe('test-correlation-123');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// PRE-FILTER INTEGRATION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Orchestrator: Pre-Filter Integration', () => {
  it('blocks self-harm content before reaching LLM', async () => {
    const request = createRequest({ input: 'I want to hurt myself' });
    const mockInvoke = vi.fn();

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: mockInvoke,
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    // Should return safe response without calling LLM
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(response.wasBlocked).toBe(true);
    // Should route to trusted adults
    expect(response.output.toLowerCase()).toMatch(/parent|teacher|counselor|adult/);
  });

  it('applies safety action for blocked content', async () => {
    const request = createRequest({ input: 'I want to kill myself' });

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(),
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    expect(response.safetyActions).toContain('BLOCKED_SELF_HARM');
  });

  it('redacts PII before sending to LLM', async () => {
    const request = createRequest({ input: 'My email is john@example.com, help with math' });
    const mockInvoke = vi.fn(async () => ({
      content: 'I can help you with math!',
      tokenUsage: { inputTokens: 10, outputTokens: 20 },
    }));

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: mockInvoke,
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    // Should have called LLM with redacted content
    expect(mockInvoke).toHaveBeenCalled();
    expect(response.safetyActions).toContain('REDACTED_PII');
    // The preFilter uses [EMAIL] for email redaction
    expect(response.redactedInput).toContain('[EMAIL]');
  });

  it('blocks explicit content', async () => {
    // Use input that matches the explicit patterns (porn, nude photos, etc.)
    const request = createRequest({ input: 'Show me porn videos' });
    const mockInvoke = vi.fn();

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: mockInvoke,
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(response.wasBlocked).toBe(true);
    expect(response.safetyActions).toContain('BLOCKED_EXPLICIT_CONTENT');
  });

  it('blocks abuse-related content', async () => {
    const request = createRequest({ input: 'My teacher hits me at school' });
    const mockInvoke = vi.fn();

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: mockInvoke,
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    expect(response.wasBlocked).toBe(true);
    // Should route to trusted adults
    expect(response.output.toLowerCase()).toMatch(/parent|teacher|counselor|adult/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// POST-FILTER INTEGRATION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Orchestrator: Post-Filter Integration', () => {
  it('blocks homework answers for HOMEWORK_HELPER agent', async () => {
    const request = createRequest({ agentType: 'HOMEWORK_HELPER' });

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(async () => ({
        content: 'The answer is 42. Just write 42.',
        tokenUsage: { inputTokens: 30, outputTokens: 20 },
      })),
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    // Post-filter should block direct answers
    expect(response.safetyActions).toContain('BLOCKED_HOMEWORK_ANSWER');
  });

  it('allows direct answers for BASELINE agent', async () => {
    const request = createRequest({ agentType: 'BASELINE' });

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(async () => ({
        content: 'The answer is 42.',
        tokenUsage: { inputTokens: 30, outputTokens: 20 },
      })),
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    // BASELINE agent should allow direct answers
    expect(response.output).toBe('The answer is 42.');
    expect(response.safetyActions).not.toContain('BLOCKED_HOMEWORK_ANSWER');
  });

  it('blocks diagnosis attempts in LLM output', async () => {
    const request = createRequest();

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(async () => ({
        content: 'Based on what you described, you have ADHD.',
        tokenUsage: { inputTokens: 30, outputTokens: 20 },
      })),
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    expect(response.safetyActions).toContain('BLOCKED_DIAGNOSIS_ATTEMPT');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURATION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Orchestrator: Configuration', () => {
  it('disables pre-filter when configured', async () => {
    const request = createRequest({ input: 'I want to hurt myself' });

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(async () => ({
        content: 'Test response',
        tokenUsage: { inputTokens: 10, outputTokens: 20 },
      })),
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(
      request,
      { providerRouter: mockRouter },
      { enablePreFilter: false }
    );

    // Pre-filter disabled, so should reach LLM
    expect(response.wasBlocked).toBeFalsy();
  });

  it('disables post-filter when configured', async () => {
    const request = createRequest({ agentType: 'HOMEWORK_HELPER' });

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(async () => ({
        content: 'The answer is 42.',
        tokenUsage: { inputTokens: 30, outputTokens: 20 },
      })),
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(
      request,
      { providerRouter: mockRouter },
      { enablePostFilter: false }
    );

    // Post-filter disabled, so direct answer should be allowed
    expect(response.output).toBe('The answer is 42.');
    expect(response.safetyActions).not.toContain('BLOCKED_HOMEWORK_ANSWER');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Orchestrator: Error Handling', () => {
  it('handles provider errors gracefully', async () => {
    const request = createRequest();

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('MOCK', {
      generateCompletion: vi.fn(async () => {
        throw new Error('Provider API error');
      }),
    } as never);
    mockRouter.setTenantConfig('tenant-123', {
      allowedProviders: ['MOCK'],
      providerPriority: ['MOCK'],
    });

    const response = await orchestrateAiRequest(request, {
      providerRouter: mockRouter,
    });

    // Should return error response without throwing
    expect(response.output).toMatch(/sorry|trouble/i);
    expect(response.metadata?.error).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// MULTI-TENANT TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Orchestrator: Multi-Tenant', () => {
  it('uses tenant-specific provider config', async () => {
    const requestA = createRequest({ tenantId: 'tenant-A' });
    const requestB = createRequest({ tenantId: 'tenant-B' });

    const mockRouter = new ProviderRouter();
    mockRouter.registerProvider('OPENAI', {
      generateCompletion: vi.fn(async () => ({
        content: 'OpenAI response',
        tokenUsage: { inputTokens: 10, outputTokens: 20 },
      })),
    } as never);
    mockRouter.registerProvider('ANTHROPIC', {
      generateCompletion: vi.fn(async () => ({
        content: 'Anthropic response',
        tokenUsage: { inputTokens: 10, outputTokens: 20 },
      })),
    } as never);

    mockRouter.setTenantConfig('tenant-A', {
      allowedProviders: ['OPENAI'],
      providerPriority: ['OPENAI'],
    });
    mockRouter.setTenantConfig('tenant-B', {
      allowedProviders: ['ANTHROPIC'],
      providerPriority: ['ANTHROPIC'],
    });

    const responseA = await orchestrateAiRequest(requestA, {
      providerRouter: mockRouter,
    });
    const responseB = await orchestrateAiRequest(requestB, {
      providerRouter: mockRouter,
    });

    expect(responseA.provider).toBe('OPENAI');
    expect(responseB.provider).toBe('ANTHROPIC');
  });
});
