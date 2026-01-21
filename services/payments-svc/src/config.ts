/**
 * Payments Service Configuration
 */

import { createLogger } from '@aivo/ts-api-utils';

const logger = createLogger('payments-svc');

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Placeholder values that should NEVER be used in production
 */
const PLACEHOLDER_VALUES = [
  'sk_test_placeholder',
  'whsec_placeholder',
  'placeholder',
  'your_key_here',
  'REPLACE_ME',
];

function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_VALUES.some(
    (placeholder) => value.toLowerCase().includes(placeholder.toLowerCase())
  );
}

function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && isProduction) {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

/**
 * Require a Stripe key, failing in production if it's a placeholder
 */
function requireStripeKey(name: string): string {
  const value = process.env[name];

  // In production, the key must be set and not be a placeholder
  if (isProduction) {
    if (!value) {
      throw new Error(`CRITICAL: ${name} must be set in production`);
    }
    if (isPlaceholderValue(value)) {
      throw new Error(
        `CRITICAL: ${name} contains a placeholder value. ` +
        `Set a valid Stripe key in production.`
      );
    }
  }

  // In development/test, allow placeholder for local development
  if (!value && !isProduction) {
    if (!isTest) {
      logger.warn(
        `${name} not set - using development placeholder. ` +
        `Payment operations will not work.`
      );
    }
    return name === 'STRIPE_SECRET_KEY' ? 'sk_test_development_placeholder' : 'whsec_development_placeholder';
  }

  return value || '';
}

export const config = {
  // Server
  port: Number.parseInt(process.env.PORT ?? '4070', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Stripe - no default placeholders, must be explicitly set
  stripe: {
    secretKey: requireStripeKey('STRIPE_SECRET_KEY'),
    webhookSecret: requireStripeKey('STRIPE_WEBHOOK_SECRET'),
    apiVersion: '2025-02-24.acacia' as const,
  },

  // Billing service URL (for DB operations)
  billingServiceUrl: requireEnvInProduction('BILLING_SERVICE_URL', 'http://localhost:4060'),

  // Database URL (shared with billing-svc or separate)
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_billing'),

  // Default trial days for parent subscriptions
  defaultTrialDays: Number.parseInt(process.env.DEFAULT_TRIAL_DAYS ?? '30', 10),

  // Entitlements service URL (for sync operations)
  entitlementsSvcUrl: requireEnvInProduction('ENTITLEMENTS_SVC_URL', 'http://localhost:4080'),

  // Dunning configuration
  dunning: {
    gracePeriodDays: Number.parseInt(process.env.DUNNING_GRACE_PERIOD_DAYS ?? '7', 10),
    enableAutoDowngrade: process.env.DUNNING_AUTO_DOWNGRADE !== 'false',
  },

  // Event bus configuration (Redis pub/sub)
  eventBus: {
    redisUrl: requireEnvInProduction('REDIS_URL', 'redis://localhost:6379'),
    channelPrefix: process.env.EVENT_BUS_CHANNEL_PREFIX ?? 'aivo:billing',
    enabled: process.env.EVENT_BUS_ENABLED !== 'false',
  },
} as const;

// Additional production validations
if (isProduction) {
  // Warn about test keys in production (but allow it for staging)
  if (config.stripe.secretKey.startsWith('sk_test')) {
    logger.warn(
      'SECURITY WARNING: Using Stripe test key in production environment. ' +
      'Ensure this is intentional (e.g., staging environment).'
    );
  }

  // Ensure webhook secret is properly set
  if (config.stripe.webhookSecret.includes('placeholder')) {
    throw new Error('CRITICAL: STRIPE_WEBHOOK_SECRET contains placeholder - payments will fail');
  }

  logger.info('Stripe configuration validated for production');
}
