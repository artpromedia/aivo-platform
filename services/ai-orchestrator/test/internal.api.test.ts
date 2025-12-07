import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { AgentConfigRegistry } from '../src/registry/AgentConfigRegistry.js';
import { InMemoryAgentConfigStore } from '../src/registry/store.js';

const seedConfigs = [
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

beforeAll(async () => {
  const store = new InMemoryAgentConfigStore(seedConfigs);
  const registry = new AgentConfigRegistry(store);
  app = createApp({ registry, store });
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
});
