import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { AgentConfigRegistry } from '../src/registry/AgentConfigRegistry.js';
import { InMemoryAgentConfigStore } from '../src/registry/store.js';

const baseSeed = [
  {
    id: 'cfg-a',
    agentType: 'BASELINE' as const,
    modelName: 'mock-model-a',
    provider: 'MOCK' as const,
    promptTemplate: 'hello {{agentType}}',
    hyperparameters: {},
    version: 'v1',
    rolloutPercentage: 50,
    isActive: true,
  },
  {
    id: 'cfg-b',
    agentType: 'BASELINE' as const,
    modelName: 'mock-model-b',
    provider: 'MOCK' as const,
    promptTemplate: 'hello {{agentType}} b',
    hyperparameters: {},
    version: 'v2',
    rolloutPercentage: 50,
    isActive: true,
  },
];

describe('AgentConfigRegistry', () => {
  it('returns an active config', async () => {
    const registry = new AgentConfigRegistry(new InMemoryAgentConfigStore(baseSeed));
    const config = await registry.getActiveConfig('BASELINE');
    expect(config.agentType).toBe('BASELINE');
    expect(config.version).toBeDefined();
  });

  it('selects deterministically for rollout key', async () => {
    const registry = new AgentConfigRegistry(new InMemoryAgentConfigStore(baseSeed));
    const first = await registry.getConfigForRollout('BASELINE', 'user-123');
    const second = await registry.getConfigForRollout('BASELINE', 'user-123');
    expect(first.id).toBe(second.id);
  });

  it('throws when no configs exist', async () => {
    const registry = new AgentConfigRegistry(new InMemoryAgentConfigStore());
    await expect(registry.getActiveConfig('TUTOR')).rejects.toThrow();
  });

  it('normalizes rollout when total exceeds 100 and preserves proportions', async () => {
    const registry = new AgentConfigRegistry(
      new InMemoryAgentConfigStore([
        { ...baseSeed[0], id: 'cfg-over-a', rolloutPercentage: 80 },
        { ...baseSeed[1], id: 'cfg-over-b', rolloutPercentage: 40 },
      ])
    );

    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 500; i += 1) {
      const key = `user-${i}`;
      const cfg = await registry.getConfigForRollout('BASELINE', key);
      if (cfg.id === 'cfg-over-a') counts.a += 1;
      if (cfg.id === 'cfg-over-b') counts.b += 1;
    }
    const ratioA = counts.a / (counts.a + counts.b);
    expect(ratioA).toBeGreaterThan(0.6);
    expect(ratioA).toBeLessThan(0.75);
  });

  it('changes selected config after rollout percentage update', async () => {
    const store = new InMemoryAgentConfigStore([
      { ...baseSeed[0], id: 'cfg-roll-a', rolloutPercentage: 20 },
      { ...baseSeed[1], id: 'cfg-roll-b', rolloutPercentage: 80 },
    ]);
    const registry = new AgentConfigRegistry(store);

    const key = findBucketKey(50);
    const first = await registry.getConfigForRollout('BASELINE', key);
    expect(first.id).toBe('cfg-roll-b');

    await registry.update('cfg-roll-a', { rolloutPercentage: 70 });
    await registry.update('cfg-roll-b', { rolloutPercentage: 30 });

    const second = await registry.getConfigForRollout('BASELINE', key);
    expect(second.id).toBe('cfg-roll-a');
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
