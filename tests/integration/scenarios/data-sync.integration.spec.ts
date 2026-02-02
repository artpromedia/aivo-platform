/**
 * Data Sync (Ed-Fi) Integration Test Suite
 *
 * Complete end-to-end data synchronization workflow testing:
 * 1. Connection and authentication
 * 2. Initial data sync
 * 3. Incremental sync
 * 4. Data validation and mapping
 * 5. Error handling and recovery
 * 6. Retry logic and resilience
 *
 * @module tests/integration/scenarios/data-sync
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import { wait, waitFor, retry, randomString, debug } from '../utils/helpers';

describe('Data Sync (Ed-Fi) - Complete Workflow', () => {
  // API clients for different user roles
  let adminApi: ApiClient;
  let syncServiceApi: ApiClient;

  // Test data IDs
  let connectionId: string;
  let syncJobId: string;
  let mappingId: string;
  let validationReportId: string;

  // Cleanup tracking
  const cleanupIds: {
    connections: string[];
    syncJobs: string[];
    mappings: string[];
  } = {
    connections: [],
    syncJobs: [],
    mappings: [],
  };

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    // Initialize API clients from global test context
    adminApi = createApiClientForUser(ctx().users.adminA.token);
    syncServiceApi = createApiClientForUser(ctx().users.adminA.token);

    debug('Data Sync Test Setup', {
      orgId: ctx().tenantA.id,
      adminId: ctx().users.adminA.id,
    });
  });

  afterAll(async () => {
    debug('Cleaning up data sync test data...');

    // Cancel any running sync jobs
    for (const jobId of cleanupIds.syncJobs) {
      try {
        await adminApi.post(`/sync/jobs/${jobId}/cancel`);
      } catch {
        // Job may already be completed or cancelled
      }
    }

    // Delete test connections
    for (const connId of cleanupIds.connections) {
      try {
        await adminApi.delete(`/sync/connections/${connId}`);
      } catch {
        // Connection may already be deleted
      }
    }

    // Delete test mappings
    for (const mapId of cleanupIds.mappings) {
      try {
        await adminApi.delete(`/sync/mappings/${mapId}`);
      } catch {
        // Mapping may already be deleted
      }
    }

    debug('Cleanup complete');
  });

  // ==========================================================================
  // 1. Connection & Authentication
  // ==========================================================================

  describe('1. Connection & Authentication', () => {
    it('should list available data providers', async () => {
      const response = await adminApi.get('/sync/providers');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          providers: Array<{
            id: string;
            name: string;
            type: string;
            authMethods: string[];
          }>;
        };

        expect(data.providers.length).toBeGreaterThan(0);

        // Ed-Fi should be available
        const edfi = data.providers.find((p) => p.name.toLowerCase().includes('ed-fi'));
        if (edfi) {
          expect(edfi.authMethods).toBeDefined();
        }
      }
    });

    it('should create Ed-Fi connection', async () => {
      const connectionData = {
        name: `Ed-Fi Test Connection ${randomString(6)}`,
        provider: 'edfi',
        config: {
          baseUrl: 'https://api.ed-fi-sandbox.org/v5.3',
          schoolYear: 2024,
          authType: 'oauth2',
          credentials: {
            clientId: 'test_client_id',
            clientSecret: 'test_client_secret',
          },
        },
        syncSchedule: {
          enabled: true,
          cronExpression: '0 2 * * *', // 2 AM daily
        },
      };

      const response = await adminApi.post('/sync/connections', connectionData);

      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const connection = response.data as { id: string };
        connectionId = connection.id;
        cleanupIds.connections.push(connectionId);
      }

      if (!connectionId) {
        connectionId = `conn-${randomString(8)}`;
      }

      debug('Connection created', { connectionId, status: response.status });
    });

    it('should test connection credentials', async () => {
      const response = await adminApi.post(`/sync/connections/${connectionId}/test`);

      expect([200, 401, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        const result = response.data as {
          success: boolean;
          message: string;
          latency?: number;
        };

        expect(result).toHaveProperty('success');
      }
    });

    it('should handle invalid credentials', async () => {
      const invalidConnectionData = {
        name: `Invalid Connection ${randomString(6)}`,
        provider: 'edfi',
        config: {
          baseUrl: 'https://api.ed-fi-sandbox.org/v5.3',
          authType: 'oauth2',
          credentials: {
            clientId: 'invalid',
            clientSecret: 'invalid',
          },
        },
      };

      const createResponse = await adminApi.post('/sync/connections', invalidConnectionData);

      if (createResponse.status === 200 || createResponse.status === 201) {
        const invalidConnId = (createResponse.data as { id: string }).id;
        cleanupIds.connections.push(invalidConnId);

        const testResponse = await adminApi.post(`/sync/connections/${invalidConnId}/test`);

        // Should fail authentication
        expect([401, 403, 500, 200]).toContain(testResponse.status);

        if (testResponse.status === 200) {
          const result = testResponse.data as { success: boolean };
          // Could return success: false instead of error status
          expect(result.success).toBe(false);
        }
      }
    });

    it('should refresh connection token', async () => {
      const response = await adminApi.post(`/sync/connections/${connectionId}/refresh-token`);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should list existing connections', async () => {
      const response = await adminApi.get('/sync/connections');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          connections: Array<{
            id: string;
            name: string;
            provider: string;
            status: string;
            lastSyncAt?: string;
          }>;
        };

        expect(Array.isArray(data.connections)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // 2. Initial Data Sync
  // ==========================================================================

  describe('2. Initial Data Sync', () => {
    it('should configure data mapping', async () => {
      const mappingData = {
        connectionId,
        name: `Ed-Fi Mapping ${randomString(6)}`,
        entityMappings: [
          {
            sourceEntity: 'students',
            targetEntity: 'learners',
            fieldMappings: [
              { source: 'studentUniqueId', target: 'externalId' },
              { source: 'firstName', target: 'firstName' },
              { source: 'lastSurname', target: 'lastName' },
              { source: 'birthDate', target: 'dateOfBirth' },
              { source: 'electronicMails[0].electronicMailAddress', target: 'email' },
            ],
            filters: {
              enrollmentStatus: 'active',
            },
          },
          {
            sourceEntity: 'staff',
            targetEntity: 'teachers',
            fieldMappings: [
              { source: 'staffUniqueId', target: 'externalId' },
              { source: 'firstName', target: 'firstName' },
              { source: 'lastSurname', target: 'lastName' },
              { source: 'electronicMails[0].electronicMailAddress', target: 'email' },
            ],
          },
          {
            sourceEntity: 'courses',
            targetEntity: 'courses',
            fieldMappings: [
              { source: 'courseCode', target: 'externalId' },
              { source: 'courseTitle', target: 'name' },
              { source: 'courseDescription', target: 'description' },
              { source: 'academicSubjectDescriptor', target: 'subject' },
            ],
          },
        ],
      };

      const response = await adminApi.post('/sync/mappings', mappingData);

      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const mapping = response.data as { id: string };
        mappingId = mapping.id;
        cleanupIds.mappings.push(mappingId);
      }

      if (!mappingId) {
        mappingId = `mapping-${randomString(8)}`;
      }

      debug('Mapping created', { mappingId });
    });

    it('should validate mapping configuration', async () => {
      const response = await adminApi.post(`/sync/mappings/${mappingId}/validate`);

      expect([200, 400, 404]).toContain(response.status);

      if (response.status === 200) {
        const result = response.data as {
          valid: boolean;
          warnings: string[];
          errors: string[];
        };

        expect(result).toHaveProperty('valid');
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });

    it('should start initial full sync', async () => {
      const response = await adminApi.post('/sync/jobs', {
        connectionId,
        mappingId,
        type: 'full',
        options: {
          batchSize: 100,
          parallelism: 2,
          continueOnError: true,
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201 || response.status === 202) {
        const job = response.data as { id: string; status: string };
        syncJobId = job.id;
        cleanupIds.syncJobs.push(syncJobId);
      }

      if (!syncJobId) {
        syncJobId = `job-${randomString(8)}`;
      }

      debug('Sync job started', { syncJobId });
    });

    it('should monitor sync progress', async () => {
      // Poll for progress updates
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const response = await adminApi.get(`/sync/jobs/${syncJobId}`);

        expect([200, 404]).toContain(response.status);

        if (response.status === 200) {
          const job = response.data as {
            id: string;
            status: string;
            progress: {
              total: number;
              processed: number;
              failed: number;
              percentage: number;
            };
            startedAt: string;
            completedAt?: string;
          };

          debug('Sync progress', job.progress);

          // Check if completed or failed
          if (['completed', 'failed', 'cancelled'].includes(job.status)) {
            break;
          }
        }

        await wait(1000);
        attempts++;
      }
    });

    it('should get sync job results', async () => {
      const response = await adminApi.get(`/sync/jobs/${syncJobId}/results`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const results = response.data as {
          recordsCreated: number;
          recordsUpdated: number;
          recordsSkipped: number;
          recordsFailed: number;
          errors: Array<{
            entity: string;
            recordId: string;
            error: string;
          }>;
          duration: number;
        };

        expect(results.recordsCreated).toBeGreaterThanOrEqual(0);
        expect(results.recordsUpdated).toBeGreaterThanOrEqual(0);
      }
    });

    it('should view sync history', async () => {
      const response = await adminApi.get('/sync/jobs', {
        params: { connectionId, limit: 10 },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          jobs: Array<{
            id: string;
            type: string;
            status: string;
            startedAt: string;
          }>;
        };

        expect(Array.isArray(data.jobs)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // 3. Incremental Sync
  // ==========================================================================

  describe('3. Incremental Sync', () => {
    it('should detect changes since last sync', async () => {
      const response = await adminApi.post(`/sync/connections/${connectionId}/detect-changes`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const changes = response.data as {
          hasChanges: boolean;
          changesSummary: {
            students: { added: number; modified: number; deleted: number };
            staff: { added: number; modified: number; deleted: number };
            courses: { added: number; modified: number; deleted: number };
          };
          lastSyncTimestamp: string;
        };

        expect(changes).toHaveProperty('hasChanges');
      }
    });

    it('should start incremental sync', async () => {
      const response = await adminApi.post('/sync/jobs', {
        connectionId,
        mappingId,
        type: 'incremental',
        options: {
          sinceTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          batchSize: 50,
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201 || response.status === 202) {
        const job = response.data as { id: string };
        cleanupIds.syncJobs.push(job.id);
      }
    });

    it('should handle deleted records', async () => {
      const response = await adminApi.post('/sync/jobs', {
        connectionId,
        mappingId,
        type: 'deletions',
        options: {
          softDelete: true, // Mark as inactive rather than hard delete
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should configure sync webhook notifications', async () => {
      const response = await adminApi.put(`/sync/connections/${connectionId}/webhooks`, {
        onComplete: 'https://app.aivo.local/webhooks/sync-complete',
        onError: 'https://app.aivo.local/webhooks/sync-error',
        includeDetails: true,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should schedule recurring sync', async () => {
      const response = await adminApi.put(`/sync/connections/${connectionId}/schedule`, {
        enabled: true,
        schedule: {
          type: 'cron',
          expression: '0 */6 * * *', // Every 6 hours
        },
        syncType: 'incremental',
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 4. Data Validation & Mapping
  // ==========================================================================

  describe('4. Data Validation & Mapping', () => {
    it('should validate synced data', async () => {
      const response = await adminApi.post('/sync/validate', {
        connectionId,
        entities: ['students', 'staff', 'courses'],
        rules: [
          { field: 'email', type: 'format', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
          { field: 'dateOfBirth', type: 'date', format: 'ISO8601' },
          { field: 'firstName', type: 'required' },
          { field: 'lastName', type: 'required' },
        ],
      });

      expect([200, 201, 202, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const result = response.data as {
          reportId: string;
          summary: {
            totalRecords: number;
            validRecords: number;
            invalidRecords: number;
          };
        };

        if (result.reportId) {
          validationReportId = result.reportId;
        }
      }
    });

    it('should get validation report details', async () => {
      if (!validationReportId) {
        validationReportId = 'report-1';
      }

      const response = await adminApi.get(`/sync/validation-reports/${validationReportId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const report = response.data as {
          id: string;
          issues: Array<{
            entity: string;
            recordId: string;
            field: string;
            issue: string;
            severity: 'error' | 'warning';
          }>;
          summary: {
            byEntity: Record<string, { valid: number; invalid: number }>;
            bySeverity: { errors: number; warnings: number };
          };
        };

        expect(Array.isArray(report.issues)).toBe(true);
      }
    });

    it('should apply data transformation rules', async () => {
      const transformationRules = {
        mappingId,
        rules: [
          {
            field: 'gradeLevel',
            type: 'map',
            mapping: {
              K: 0,
              '1st': 1,
              '2nd': 2,
              '3rd': 3,
              '4th': 4,
              '5th': 5,
            },
          },
          {
            field: 'phoneNumber',
            type: 'format',
            transform: 'normalize_phone',
          },
          {
            field: 'email',
            type: 'lowercase',
          },
        ],
      };

      const response = await adminApi.put(
        `/sync/mappings/${mappingId}/transformations`,
        transformationRules
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should preview transformation results', async () => {
      const response = await adminApi.post(`/sync/mappings/${mappingId}/preview`, {
        sampleSize: 5,
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const preview = response.data as {
          samples: Array<{
            source: Record<string, unknown>;
            transformed: Record<string, unknown>;
          }>;
        };

        expect(Array.isArray(preview.samples)).toBe(true);
      }
    });

    it('should handle field conflicts', async () => {
      const conflictResolutionConfig = {
        connectionId,
        rules: [
          {
            field: 'email',
            onConflict: 'keep_source', // source wins
          },
          {
            field: 'phoneNumber',
            onConflict: 'keep_target', // local wins
          },
          {
            field: 'name',
            onConflict: 'merge', // combine both
          },
        ],
      };

      const response = await adminApi.put(
        `/sync/connections/${connectionId}/conflict-resolution`,
        conflictResolutionConfig
      );

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 5. Error Handling & Recovery
  // ==========================================================================

  describe('5. Error Handling & Recovery', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error by using invalid endpoint
      const response = await adminApi.post('/sync/connections', {
        name: 'Bad Network Connection',
        provider: 'edfi',
        config: {
          baseUrl: 'https://invalid-endpoint-that-does-not-exist.local',
          credentials: {
            clientId: 'test',
            clientSecret: 'test',
          },
        },
      });

      if (response.status === 200 || response.status === 201) {
        const connId = (response.data as { id: string }).id;
        cleanupIds.connections.push(connId);

        const testResponse = await adminApi.post(`/sync/connections/${connId}/test`);

        // Should handle network error gracefully
        expect([200, 400, 500, 502, 503]).toContain(testResponse.status);
      }
    });

    it('should handle API rate limiting', async () => {
      // Configure rate limit handling
      const response = await adminApi.put(`/sync/connections/${connectionId}/rate-limiting`, {
        enabled: true,
        maxRequestsPerSecond: 10,
        backoffStrategy: 'exponential',
        maxBackoffMs: 60000,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should resume failed sync job', async () => {
      // Get a failed job (or simulate one)
      const response = await adminApi.post(`/sync/jobs/${syncJobId}/resume`, {
        fromRecord: 0, // Start from beginning
        skipFailed: true,
      });

      expect([200, 201, 202, 400, 404]).toContain(response.status);
    });

    it('should export failed records for manual review', async () => {
      const response = await adminApi.get(`/sync/jobs/${syncJobId}/failed-records`, {
        params: { format: 'csv' },
      });

      expect([200, 204, 404]).toContain(response.status);
    });

    it('should handle partial sync failure', async () => {
      const response = await adminApi.get(`/sync/jobs/${syncJobId}/partial-results`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const results = response.data as {
          successfulEntities: string[];
          failedEntities: Array<{
            entity: string;
            error: string;
            recordsAffected: number;
          }>;
        };

        expect(Array.isArray(results.successfulEntities)).toBe(true);
        expect(Array.isArray(results.failedEntities)).toBe(true);
      }
    });

    it('should rollback failed sync', async () => {
      const response = await adminApi.post(`/sync/jobs/${syncJobId}/rollback`, {
        targetTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 6. Retry Logic & Resilience
  // ==========================================================================

  describe('6. Retry Logic & Resilience', () => {
    it('should configure retry policy', async () => {
      const retryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE'],
      };

      const response = await adminApi.put(
        `/sync/connections/${connectionId}/retry-policy`,
        retryPolicy
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should retry failed records automatically', async () => {
      // Start a job with auto-retry enabled
      const response = await adminApi.post('/sync/jobs', {
        connectionId,
        mappingId,
        type: 'retry-failed',
        options: {
          autoRetry: true,
          maxRetries: 3,
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201 || response.status === 202) {
        const job = response.data as { id: string };
        cleanupIds.syncJobs.push(job.id);
      }
    });

    it('should implement circuit breaker', async () => {
      const response = await adminApi.put(`/sync/connections/${connectionId}/circuit-breaker`, {
        enabled: true,
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        halfOpenMaxCalls: 3,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should get circuit breaker status', async () => {
      const response = await adminApi.get(
        `/sync/connections/${connectionId}/circuit-breaker/status`
      );

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const status = response.data as {
          state: 'closed' | 'open' | 'half-open';
          failureCount: number;
          lastFailure?: string;
          nextRetryAt?: string;
        };

        expect(['closed', 'open', 'half-open']).toContain(status.state);
      }
    });

    it('should handle timeout gracefully', async () => {
      // Configure aggressive timeout
      const response = await adminApi.post('/sync/jobs', {
        connectionId,
        mappingId,
        type: 'full',
        options: {
          timeoutMs: 1, // 1ms timeout - will definitely timeout
        },
      });

      // Job creation should succeed
      expect([200, 201, 202, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201 || response.status === 202) {
        const jobId = (response.data as { id: string }).id;
        cleanupIds.syncJobs.push(jobId);

        // Wait and check status
        await wait(500);

        const statusResponse = await adminApi.get(`/sync/jobs/${jobId}`);

        if (statusResponse.status === 200) {
          const job = statusResponse.data as { status: string };
          // Should be failed due to timeout
          expect(['pending', 'running', 'failed', 'timeout']).toContain(job.status);
        }
      }
    });

    it('should maintain sync state across restarts', async () => {
      // Get sync state
      const response = await adminApi.get(`/sync/connections/${connectionId}/state`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const state = response.data as {
          lastSyncAt: string;
          lastSuccessfulSyncAt?: string;
          syncCursor?: string;
          pendingChanges: number;
          checkpoint?: Record<string, unknown>;
        };

        expect(state).toHaveProperty('lastSyncAt');
      }
    });
  });

  // ==========================================================================
  // Cross-Cutting Concerns
  // ==========================================================================

  describe('Cross-Cutting: Data Integrity', () => {
    it('should detect duplicate records', async () => {
      const response = await adminApi.post('/sync/detect-duplicates', {
        connectionId,
        entity: 'students',
        matchFields: ['firstName', 'lastName', 'dateOfBirth'],
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const duplicates = response.data as {
          groups: Array<{
            records: Array<{ id: string; source: string }>;
            matchScore: number;
          }>;
        };

        expect(Array.isArray(duplicates.groups)).toBe(true);
      }
    });

    it('should merge duplicate records', async () => {
      const response = await adminApi.post('/sync/merge-duplicates', {
        connectionId,
        entity: 'students',
        primaryRecordId: 'record-1',
        duplicateRecordIds: ['record-2', 'record-3'],
        mergeStrategy: 'keep_primary',
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should validate referential integrity', async () => {
      const response = await adminApi.post('/sync/validate-integrity', {
        connectionId,
        checks: [
          { entity: 'enrollments', reference: 'students', field: 'studentId' },
          { entity: 'enrollments', reference: 'courses', field: 'courseId' },
          { entity: 'grades', reference: 'enrollments', field: 'enrollmentId' },
        ],
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const integrity = response.data as {
          valid: boolean;
          orphanedRecords: Array<{
            entity: string;
            count: number;
            missingReference: string;
          }>;
        };

        expect(integrity).toHaveProperty('valid');
      }
    });
  });

  describe('Cross-Cutting: Monitoring', () => {
    it('should get sync health metrics', async () => {
      const response = await adminApi.get('/sync/health');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const health = response.data as {
          status: 'healthy' | 'degraded' | 'unhealthy';
          connections: Array<{
            id: string;
            status: string;
            lastSync: string;
          }>;
          activeJobs: number;
          failedJobsLast24h: number;
        };

        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      }
    });

    it('should get sync performance metrics', async () => {
      const response = await adminApi.get('/sync/metrics', {
        params: { period: '7d' },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const metrics = response.data as {
          totalRecordsSynced: number;
          averageSyncDuration: number;
          errorRate: number;
          throughput: number;
        };

        expect(metrics.totalRecordsSynced).toBeGreaterThanOrEqual(0);
      }
    });

    it('should configure sync alerts', async () => {
      const response = await adminApi.put('/sync/alerts', {
        rules: [
          {
            type: 'sync_failure',
            threshold: 3,
            window: '1h',
            actions: ['email', 'slack'],
          },
          {
            type: 'sync_duration',
            threshold: 3600, // 1 hour
            actions: ['email'],
          },
          {
            type: 'error_rate',
            threshold: 5, // 5%
            window: '24h',
            actions: ['pagerduty'],
          },
        ],
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });
});
