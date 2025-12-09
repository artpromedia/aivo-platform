/**
 * Payments Service Configuration
 */

function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  // Server
  port: parseInt(process.env.PORT ?? '4070', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Stripe
  stripe: {
    secretKey: requireEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder'),
    webhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET', 'whsec_placeholder'),
    apiVersion: '2025-02-24.acacia' as const,
  },

  // Billing service URL (for DB operations)
  billingServiceUrl: process.env.BILLING_SERVICE_URL ?? 'http://localhost:4060',

  // Database URL (shared with billing-svc or separate)
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/aivo_billing',

  // Default trial days for parent subscriptions
  defaultTrialDays: parseInt(process.env.DEFAULT_TRIAL_DAYS ?? '30', 10),

  // Entitlements service URL (for sync operations)
  entitlementsSvcUrl: process.env.ENTITLEMENTS_SVC_URL ?? 'http://localhost:4080',

  // Dunning configuration
  dunning: {
    gracePeriodDays: parseInt(process.env.DUNNING_GRACE_PERIOD_DAYS ?? '7', 10),
    enableAutoDowngrade: process.env.DUNNING_AUTO_DOWNGRADE !== 'false',
  },
} as const;

// Validate Stripe keys in production
if (config.nodeEnv === 'production') {
  if (config.stripe.secretKey.startsWith('sk_test')) {
    console.warn('⚠️  WARNING: Using Stripe test key in production!');
  }
  if (config.stripe.webhookSecret === 'whsec_placeholder') {
    throw new Error('STRIPE_WEBHOOK_SECRET must be set in production');
  }
}
