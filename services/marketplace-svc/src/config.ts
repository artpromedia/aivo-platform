/**
 * Marketplace Service Configuration
 */

export const config = {
  port: Number.parseInt(process.env.PORT ?? '4070', 10),
  host: process.env.HOST ?? '0.0.0.0',

  // Database
  databaseUrl: process.env.DATABASE_URL ?? '',

  // Service URLs (for cross-service calls)
  contentSvcUrl: process.env.CONTENT_SVC_URL ?? 'http://localhost:4030',
  tenantSvcUrl: process.env.TENANT_SVC_URL ?? 'http://localhost:4020',
  authSvcUrl: process.env.AUTH_SVC_URL ?? 'http://localhost:4010',

  // Feature flags
  enableThirdPartyVendors: process.env.ENABLE_THIRD_PARTY_VENDORS === 'true',
  requireApprovalForInstalls: process.env.REQUIRE_APPROVAL_FOR_INSTALLS !== 'false',

  // Pagination defaults
  defaultPageSize: 20,
  maxPageSize: 100,
};
