import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4010),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  provider: (process.env.AI_PROVIDER || 'MOCK').toUpperCase(),
  mockSeed: process.env.AI_MOCK_SEED || 'default-seed',
  internalApiKey: process.env.INTERNAL_API_KEY || 'dev-internal-key',
  databaseUrl: process.env.DATABASE_URL,
  agentConfigCacheTtlMs: Number(process.env.AGENT_CONFIG_CACHE_TTL_MS || 30_000),
};
