/**
 * Marketplace Service Configuration
 */

function requireEnvInProduction(name: string, devDefault: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return value || devDefault;
}

export const config = {
  port: Number.parseInt(process.env.PORT ?? '4070', 10),
  host: process.env.HOST ?? '0.0.0.0',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Database
  databaseUrl: requireEnvInProduction('DATABASE_URL', 'postgresql://localhost:5432/aivo_marketplace'),

  // Service URLs (for cross-service calls)
  contentSvcUrl: requireEnvInProduction('CONTENT_SVC_URL', 'http://localhost:4030'),
  tenantSvcUrl: requireEnvInProduction('TENANT_SVC_URL', 'http://localhost:4020'),
  authSvcUrl: requireEnvInProduction('AUTH_SVC_URL', 'http://localhost:4010'),

  // Feature flags
  enableThirdPartyVendors: process.env.ENABLE_THIRD_PARTY_VENDORS === 'true',
  requireApprovalForInstalls: process.env.REQUIRE_APPROVAL_FOR_INSTALLS !== 'false',

  // Pagination defaults
  defaultPageSize: 20,
  maxPageSize: 100,
};
