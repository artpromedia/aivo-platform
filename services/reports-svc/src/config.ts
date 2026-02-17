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

  // Service URLs
  services: {
    baseline: requireEnvInProduction('BASELINE_SVC_URL', 'http://localhost:4010'),
    learnerModel: requireEnvInProduction('LEARNER_MODEL_SVC_URL', 'http://localhost:4020'),
    analytics: requireEnvInProduction('ANALYTICS_SVC_URL', 'http://localhost:4030'),
    goal: requireEnvInProduction('GOAL_SVC_URL', 'http://localhost:4040'),
    tenant: requireEnvInProduction('TENANT_SVC_URL', 'http://localhost:4000'),
    session: requireEnvInProduction('SESSION_SVC_URL', 'http://localhost:3020'),
    parent: requireEnvInProduction('PARENT_SVC_URL', 'http://localhost:3010'),
  },

  // JWT validation
  jwtIssuer: process.env.JWT_ISSUER || 'https://auth.aivo.app',
  jwtAudience: process.env.JWT_AUDIENCE || 'aivo-api',
  jwksUrl: process.env.JWKS_URL || 'https://auth.aivo.app/.well-known/jwks.json',
} as const;

export type Config = typeof config;
