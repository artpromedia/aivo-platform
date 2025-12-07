import { createHash } from 'node:crypto';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { AgentConfigRegistry } from '../src/registry/AgentConfigRegistry.js';
import { InMemoryAgentConfigStore } from '../src/registry/store.js';
import { InMemoryTelemetryStore } from '../src/telemetry/index.js';
import type { AgentConfigInput } from '../src/types/agentConfig.js';

const seedConfigs: AgentConfigInput[] = [
  {
    agentType: 'BASELINE' as const,
    modelName: 'mock-model',
    provider: 'MOCK' as const,
    promptTemplate: 'agent={{agentType}} payload={{payload}}',
    hyperparameters: { temperature: 0 },
    version: 'v1',
    rolloutPercentage: 100,
    isActive: true,
  },
];

let app: ReturnType<typeof createApp>;
const telemetryStore = new InMemoryTelemetryStore();

beforeAll(async () => {
  const store = new InMemoryAgentConfigStore(seedConfigs);
  const registry = new AgentConfigRegistry(store);
  app = createApp({ registry, store, telemetryStore });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('internal AI routes', () => {
  it('echo returns structured response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/internal/ai/echo',
      headers: {
        'content-type': 'application/json',
        'x-internal-api-key': config.internalApiKey,
      },
      payload: { message: 'hello-world' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.response.content).toContain('hello-world');
    expect(typeof body.response.tokensUsed).toBe('number');
  });

  it('test-agent echoes agentType in metadata', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/internal/ai/test-agent',
      headers: {
        'content-type': 'application/json',
        'x-internal-api-key': config.internalApiKey,
      },
      payload: { tenantId: 'tenant-123', agentType: 'BASELINE', payload: { foo: 'bar' } },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.response.metadata.agentType).toBe('BASELINE');
    expect(body.response.metadata.tenantId).toBe('tenant-123');
    expect(body.response.metadata.modelName).toBe('mock-model');
    expect(body.response.metadata.configVersion).toBe('v1');
    expect(body.response.safetyStatus).toBeDefined();
  });

  it('test-agent flags unsafe content', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/internal/ai/test-agent',
      headers: {
        'content-type': 'application/json',
        'x-internal-api-key': config.internalApiKey,
      },
      payload: {
        tenantId: 'tenant-123',
        agentType: 'BASELINE',
        payload: { text: 'I want to kill myself' },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.response.safetyStatus).not.toBe('OK');
    expect(body.response.safetyReason).toBe('self-harm');
  });

  it('lists agent configs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/internal/ai/configs',
      headers: {
        'x-internal-api-key': config.internalApiKey,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.configs)).toBe(true);
    expect(body.configs[0].agentType).toBe('BASELINE');
  });

  it('returns metrics summary', async () => {
    await telemetryStore.record({
      id: 'log-1',
      tenantId: 'tenant-123',
      agentType: 'BASELINE',
      modelName: 'mock-model',
      provider: 'MOCK',
      version: 'v1',
      requestId: 'req-1',
      startedAt: new Date(),
      completedAt: new Date(),
      latencyMs: 12,
      tokensPrompt: 10,
      tokensCompletion: 5,
      estimatedCostUsd: 0.000015,
      safetyStatus: 'OK',
      status: 'SUCCESS',
      errorCode: undefined,
      errorMessage: undefined,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/internal/ai/metrics/summary?tenantId=tenant-123',
      headers: {
        'x-internal-api-key': config.internalApiKey,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary.totalCalls).toBeGreaterThanOrEqual(1);
    expect(body.summary.safetyCounts.OK).toBeGreaterThanOrEqual(1);
  });

  it('rollout percentages influence selected config deterministically', async () => {
    const baseConfig = seedConfigs[0]!;
    const localStore = new InMemoryAgentConfigStore([
      {
        ...baseConfig,
        id: 'v1',
        version: 'v1',
        rolloutPercentage: 80,
        agentType: baseConfig.agentType,
        modelName: baseConfig.modelName,
        provider: baseConfig.provider,
        promptTemplate: baseConfig.promptTemplate,
        hyperparameters: baseConfig.hyperparameters ?? {},
        isActive: baseConfig.isActive ?? true,
      },
      {
        ...baseConfig,
        id: 'v2',
        version: 'v2',
        rolloutPercentage: 20,
        agentType: baseConfig.agentType,
        modelName: baseConfig.modelName,
        provider: baseConfig.provider,
        promptTemplate: baseConfig.promptTemplate,
        hyperparameters: baseConfig.hyperparameters ?? {},
        isActive: baseConfig.isActive ?? true,
      },
    ]);
    const localRegistry = new AgentConfigRegistry(localStore);
    const localApp = createApp({ registry: localRegistry, store: localStore, telemetryStore });
    await localApp.ready();

    const rolloutKey = findBucketKey(50); // bucket in mid-range

    const first = await localApp.inject({
      method: 'POST',
      url: '/internal/ai/test-agent',
      headers: {
        'content-type': 'application/json',
        'x-internal-api-key': config.internalApiKey,
      },
      payload: { tenantId: rolloutKey, agentType: 'BASELINE', payload: { foo: 'bar' } },
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.response.metadata.configVersion).toBe('v1');

    await localRegistry.update('v1', { rolloutPercentage: 10 });
    await localRegistry.update('v2', { rolloutPercentage: 90 });

    const second = await localApp.inject({
      method: 'POST',
      url: '/internal/ai/test-agent',
      headers: {
        'content-type': 'application/json',
        'x-internal-api-key': config.internalApiKey,
      },
      payload: { tenantId: rolloutKey, agentType: 'BASELINE', payload: { foo: 'bar' } },
    });
    expect(second.statusCode).toBe(200);
    const secondBody = second.json();
    expect(secondBody.response.metadata.configVersion).toBe('v2');

    await localApp.close();
  });
});

function findBucketKey(targetBucket: number): string {
  for (let i = 0; i < 2000; i += 1) {
    const candidate = `bucket-${i}`;
    const bucket = hashToBucket(candidate);
    if (bucket === targetBucket) return candidate;
  }
  return 'default-bucket-key';
}

function hashToBucket(key: string): number {
  const digest = createHash('sha256').update(key).digest();
  const int = digest.readUInt32BE(0);
  return int % 100;
}
