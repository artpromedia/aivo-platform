/**
 * Billing Service Configuration
 *
 * Uses @aivo/env-validation for fail-fast environment validation
 */

import {
  z,
  validateEnv,
  port,
  databaseUrl,
  secret,
  optional,
  isProduction,
} from '@aivo/env-validation';

/**
 * Environment schema with production-aware validation
 */
const envSchema = z.object({
  // Server configuration
  PORT: port(4060),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database (credentials should be provided via environment variables)
  DATABASE_URL: isProduction()
    ? z.string().min(1, 'DATABASE_URL is required in production')
    : databaseUrl('postgresql://localhost:5432/aivo_billing'),

  // JWT configuration (required in production)
  JWT_SECRET: secret('dev-only-secret'),

  // Stripe configuration
  // In production, at least secret key should be set for billing to work
  STRIPE_SECRET_KEY: isProduction()
    ? z.string().min(1, 'Stripe secret key is required in production')
    : z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().default(''),

  // NATS configuration for event publishing
  NATS_URL: z.string().default('nats://localhost:4222'),
  NATS_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .default('true'),

  // Redis for distributed locking/caching
  REDIS_URL: z.string().optional(),

  // Trial configuration
  DEFAULT_TRIAL_DAYS: z.coerce.number().int().min(0).max(365).default(30),

  // Grace period for past due subscriptions (days)
  PAST_DUE_GRACE_DAYS: z.coerce.number().int().min(0).max(90).default(7),

  // Service URLs
  AUTH_SERVICE_URL: z.string().default('http://auth-svc:3000'),
  TENANT_SERVICE_URL: z.string().default('http://tenant-svc:3000'),
});

/**
 * Validated environment configuration
 * Will fail fast in production if required variables are missing
 */
const env = validateEnv(envSchema, { serviceName: 'billing-svc' });

/**
 * Typed configuration object
 */
export const config = {
  port: env.PORT,
  host: env.HOST,
  nodeEnv: env.NODE_ENV,
  logLevel: env.LOG_LEVEL,
  databaseUrl: env.DATABASE_URL,

  // JWT configuration
  jwtSecret: env.JWT_SECRET,

  // Stripe configuration
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    isConfigured: Boolean(env.STRIPE_SECRET_KEY),
  },

  // NATS configuration for event publishing
  nats: {
    url: env.NATS_URL,
    enabled: env.NATS_ENABLED,
  },

  // Redis
  redis: {
    url: env.REDIS_URL,
    enabled: Boolean(env.REDIS_URL),
  },

  // Trial configuration
  defaultTrialDays: env.DEFAULT_TRIAL_DAYS,

  // Grace period for past due subscriptions (days)
  pastDueGraceDays: env.PAST_DUE_GRACE_DAYS,

  // Service URLs
  services: {
    auth: env.AUTH_SERVICE_URL,
    tenant: env.TENANT_SERVICE_URL,
  },

  // Derived flags
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
} as const;

export type Config = typeof config;
