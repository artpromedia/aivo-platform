import 'dotenv/config';

function requireEnvInProduction(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || defaultValue || '';
}

export const config = {
  port: Number(process.env.PORT || 4010),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  provider: (process.env.AI_PROVIDER || 'MOCK').toUpperCase(),
  mockSeed: process.env.AI_MOCK_SEED || 'default-seed',
  internalApiKey: requireEnvInProduction('INTERNAL_API_KEY', 'dev-only-key'),
  databaseUrl: process.env.DATABASE_URL,
  agentConfigCacheTtlMs: Number(process.env.AGENT_CONFIG_CACHE_TTL_MS || 30_000),
};
