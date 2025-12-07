import { describe, expect, it } from 'vitest';

import { AgentConfigRegistry } from '../src/registry/AgentConfigRegistry.js';
import { InMemoryAgentConfigStore } from '../src/registry/store.js';

const baseSeed = [
  {
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
});
