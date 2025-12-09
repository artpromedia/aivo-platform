/**
 * Configuration for the reports service.
 * Aggregates data from other microservices.
 */

export const config = {
  port: parseInt(process.env.PORT || '4050', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Service URLs
  services: {
    baseline: process.env.BASELINE_SVC_URL || 'http://localhost:4010',
    learnerModel: process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:4020',
    analytics: process.env.ANALYTICS_SVC_URL || 'http://localhost:4030',
    goal: process.env.GOAL_SVC_URL || 'http://localhost:4040',
    tenant: process.env.TENANT_SVC_URL || 'http://localhost:4000',
  },

  // JWT validation
  jwtIssuer: process.env.JWT_ISSUER || 'https://auth.aivo.app',
  jwtAudience: process.env.JWT_AUDIENCE || 'aivo-api',
  jwksUrl: process.env.JWKS_URL || 'https://auth.aivo.app/.well-known/jwks.json',
} as const;

export type Config = typeof config;
