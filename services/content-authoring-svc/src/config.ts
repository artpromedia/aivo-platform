/**
 * Content Authoring Service — Configuration
 *
 * Centralised config sourced from environment variables.
 */

import 'dotenv/config';

export const config = {
  port: Number.parseInt(process.env.PORT ?? '4021', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  isDev: process.env.NODE_ENV !== 'production',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Billing / entitlement enforcement
  billingServiceUrl: process.env.BILLING_SERVICE_URL ?? 'http://billing-svc:4060',
  billingCheckDisabled: process.env.BILLING_CHECK_DISABLED === 'true',
} as const;
