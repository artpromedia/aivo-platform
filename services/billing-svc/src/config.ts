/**
 * Billing Service Configuration
 */

export const config = {
  port: Number.parseInt(process.env.PORT || '4060', 10),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aivo_billing',

  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',

  // Stripe configuration (optional - only if using Stripe)
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },

  // NATS configuration for event publishing
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },

  // Trial configuration
  defaultTrialDays: Number.parseInt(process.env.DEFAULT_TRIAL_DAYS || '30', 10),

  // Grace period for past due subscriptions (days)
  pastDueGraceDays: Number.parseInt(process.env.PAST_DUE_GRACE_DAYS || '7', 10),
} as const;
