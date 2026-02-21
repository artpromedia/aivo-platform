/**
 * Configuration for the reports service.
 * Aggregates data from other microservices.
 */

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number.parseInt(process.env.PORT || '4050', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Service URLs (use K8s internal DNS defaults)
  services: {
    baseline: process.env.BASELINE_SVC_URL || 'http://baseline-svc:3000',
    learnerModel: process.env.LEARNER_MODEL_SVC_URL || 'http://personalization-svc:3000',
    analytics: process.env.ANALYTICS_SVC_URL || 'http://analytics-svc:3000',
    goal: process.env.GOAL_SVC_URL || 'http://goal-svc:3000',
    tenant: process.env.TENANT_SVC_URL || 'http://tenant-svc:3000',
    session: process.env.SESSION_SVC_URL || 'http://session-svc:3000',
    parent: process.env.PARENT_SVC_URL || 'http://parent-svc:3000',
  },

  // JWT validation
  jwtIssuer: process.env.JWT_ISSUER || 'https://auth.aivo.app',
  jwtAudience: process.env.JWT_AUDIENCE || 'aivo-api',
  jwksUrl: process.env.JWKS_URL || 'https://auth.aivo.app/.well-known/jwks.json',
} as const;

export type Config = typeof config;
