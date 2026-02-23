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
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  agentConfigCacheTtlMs: Number(process.env.AGENT_CONFIG_CACHE_TTL_MS || 30_000),

  // AI Governance — Rate Limiting
  aiRateLimitEnabled: process.env.AI_RATE_LIMIT_ENABLED !== 'false',
  aiRateLimitStudentDaily: Number(process.env.AI_RATE_LIMIT_STUDENT_DAILY || 100),
  aiRateLimitStudentHourly: Number(process.env.AI_RATE_LIMIT_STUDENT_HOURLY || 20),

  // AI Governance — Service URLs
  auditSvcUrl: process.env.AUDIT_SVC_URL || 'http://audit-svc:4050',
  brainEngineUrl: process.env.BRAIN_ENGINE_URL || 'http://brain-engine:8080',
  cognitiveLoadSvcUrl: process.env.COGNITIVE_LOAD_SVC_URL || 'http://cognitive-load-svc:4060',
  mlRecommendationUrl: process.env.ML_RECOMMENDATION_URL || 'http://ml-recommendation-svc:4070',
};
