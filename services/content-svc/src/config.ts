/**
 * Content Service - Configuration
 *
 * Centralized configuration management for content-svc.
 */

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number.parseInt(process.env.PORT ?? '4020', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Session Service - for querying learner activity history
  sessionSvcUrl: requireEnvInProduction('SESSION_SVC_URL', 'http://localhost:4050'),
  sessionSvcApiKey: process.env.SESSION_SVC_API_KEY ?? '',

  // AI Orchestrator - for AI-generated content drafts
  aiOrchestratorUrl: requireEnvInProduction('AI_ORCHESTRATOR_URL', 'http://localhost:4010'),
  aiOrchestratorApiKey: process.env.AI_ORCHESTRATOR_API_KEY ?? '',

  // NATS Configuration - for event publishing
  nats: {
    enabled: process.env.NATS_ENABLED === 'true',
    servers: process.env.NATS_SERVERS ?? 'nats://localhost:4222',
    token: process.env.NATS_TOKEN,
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASS,
  },

  // Content base URL for package building
  contentBaseUrl: process.env.CONTENT_BASE_URL ?? 'https://content.aivo.ai',
} as const;
