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
