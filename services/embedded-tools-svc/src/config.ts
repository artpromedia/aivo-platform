/**
 * Embedded Tools Service - Configuration
 */

export const config = {
  port: parseInt(process.env.PORT ?? '4080', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',

  // Tool token signing (MUST be different from main auth key)
  toolTokenSigningKey: process.env.TOOL_TOKEN_SIGNING_KEY ?? '',

  // Pseudonym generation secret (per-tenant hashing)
  tenantPseudonymSecret: process.env.TENANT_PSEUDONYM_SECRET ?? '',

  // Default session settings
  defaultSessionDurationMin: parseInt(process.env.DEFAULT_SESSION_DURATION_MIN ?? '60', 10),
  defaultTokenExpiryMin: parseInt(process.env.DEFAULT_TOKEN_EXPIRY_MIN ?? '15', 10),
  defaultIdleTimeoutMin: parseInt(process.env.DEFAULT_IDLE_TIMEOUT_MIN ?? '15', 10),

  // Platform info
  platformVersion: process.env.PLATFORM_VERSION ?? '1.0.0',
  platformEnvironment: (process.env.PLATFORM_ENVIRONMENT ?? 'development') as
    | 'development'
    | 'staging'
    | 'production',
  messageOrigin: process.env.MESSAGE_ORIGIN ?? 'https://app.aivo.com',

  // Marketplace service URL (for fetching tool configs)
  marketplaceSvcUrl: process.env.MARKETPLACE_SVC_URL ?? 'http://localhost:4070',

  // Session service URL (for recording events)
  sessionSvcUrl: process.env.SESSION_SVC_URL ?? 'http://localhost:4050',
};
