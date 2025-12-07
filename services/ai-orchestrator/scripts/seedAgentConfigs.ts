import { config } from '../src/config.js';
import { createAgentConfigStore } from '../src/registry/store.js';
import { AGENT_TYPES } from '../src/types/agentConfig.js';

async function main() {
  const store = createAgentConfigStore(config.databaseUrl);
  const seeds = AGENT_TYPES.map((agentType) => ({
    agentType,
    modelName: 'mock-model',
    provider: 'MOCK' as const,
    promptTemplate: `You are ${agentType}. Payload: {{payload}}`,
    hyperparameters: { temperature: 0 },
    version: 'v1',
    rolloutPercentage: 100,
    isActive: true,
  }));

  const createdIds: string[] = [];

  try {
    for (const seed of seeds) {
      const existing = await store.list({ agentType: seed.agentType, isActive: true });
      const duplicate = existing.find(
        (cfg) => cfg.version === seed.version && cfg.modelName === seed.modelName
      );
      if (duplicate) continue;
      const created = await store.create(seed);
      createdIds.push(created.id);
    }
  } finally {
    if (typeof store.dispose === 'function') {
      await store.dispose();
    }
  }

  if (!config.databaseUrl) {
    console.warn('DATABASE_URL is not set; seed ran against in-memory store only.');
  }

  console.log(`Seed complete. Inserted ${createdIds.length} configs.`);
}

void main();
