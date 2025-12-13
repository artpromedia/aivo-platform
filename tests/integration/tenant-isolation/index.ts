/**
 * Tenant Isolation Integration Test Suite
 *
 * This module exports all components needed to run and extend tenant isolation tests.
 * Use these exports to add custom tests or integrate with other test frameworks.
 *
 * @module tenant-isolation
 * @see docs/security/tenant_isolation.md
 */

// Test setup and utilities
export {
  type TestTenant,
  type TestUser,
  type TestLearner,
  type TestContext,
  type TestDatabaseClient,
  setupTenantIsolationTests,
  teardownTenantIsolationTests,
  generateTestJwt,
  createTestFetch,
  TenantScopedClient,
  TEST_TENANTS,
} from './setup';

// Mock database for unit testing
export {
  type TenantData,
  InMemoryTenantDatabase,
  MockDatabaseClient,
  seedTestData,
} from './mock-db';

// Report generation
export {
  type IsolationTestResult,
  type IsolationReportConfig,
  type IsolationReport,
  TenantIsolationReporter,
} from './reporter';

// Test file exports (for running specific test suites)
// - api-endpoints.test.ts: API-level tenant isolation tests
// - database-isolation.test.ts: Database-level isolation tests
// - injection-attempts.test.ts: Attack vector tests
// - event-and-storage.test.ts: Event publishing and file storage isolation tests
