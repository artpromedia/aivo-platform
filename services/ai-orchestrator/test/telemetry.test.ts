import { describe, expect, it } from 'vitest';

import { estimateCostUsd } from '../src/telemetry/cost.js';
import { InMemoryTelemetryStore } from '../src/telemetry/index.js';

describe('telemetry store and cost estimation', () => {
  it('estimates cost using rate map', () => {
    const cost = estimateCostUsd('MOCK', 'mock-model', 1500);
    expect(cost).toBeCloseTo(0.000002, 6);
  });

  it('records ai call log in memory store', async () => {
    const store = new InMemoryTelemetryStore();
    await store.record({
      id: 'log-123',
      tenantId: 'tenant-a',
      agentType: 'BASELINE',
      modelName: 'mock-model',
      provider: 'MOCK',
      version: 'v1',
      requestId: 'req-1',
      startedAt: new Date(),
      completedAt: new Date(),
      latencyMs: 10,
      tokensPrompt: 5,
      tokensCompletion: 5,
      estimatedCostUsd: 0.00001,
      safetyStatus: 'OK',
      status: 'SUCCESS',
      errorCode: undefined,
      errorMessage: undefined,
    });

    const summary = await store.summary('tenant-a');
    expect(summary.totalCalls).toBe(1);
    expect(summary.totalTokens).toBe(10);
    expect(summary.estimatedCostUsd).toBeCloseTo(0.00001, 6);
    expect(summary.safetyCounts.OK).toBe(1);
  });
});
