/**
 * Tenant Isolation - Injection Attempt Tests
 *
 * Tests various attack vectors that could bypass tenant isolation:
 * - Query parameter injection
 * - Request body injection
 * - Header manipulation
 * - JWT tampering
 * - SQL injection attempts
 *
 * @module tests/integration/tenant-isolation/injection-attempts.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  TenantIsolationTestContext,
  setupTenantIsolationTests,
  teardownTenantIsolationTests,
  apiRequest,
  assertNoDataLeak,
  createTamperedJwt,
} from './setup';
import { createMockDatabaseClient } from './mock-db';

describe('Tenant Isolation - Injection Attempts', () => {
  let ctx: TenantIsolationTestContext;

  beforeAll(async () => {
    const db = createMockDatabaseClient();
    const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:4000';
    ctx = await setupTenantIsolationTests(db, serverUrl);
  });

  afterAll(async () => {
    if (ctx) {
      await teardownTenantIsolationTests(ctx);
    }
  });

  // ==========================================================================
  // Query Parameter Attacks
  // ==========================================================================

  describe('Query Parameter Attacks', () => {
    it('rejects tenantId override in query params', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?tenantId=${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      // Should still only return Tenant A data
      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('rejects tenant_id (underscore) override in query params', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?tenant_id=${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('rejects organizationId override attempt', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?organizationId=${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('rejects filter[tenantId] override attempt', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?filter[tenantId]=${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('rejects array-based tenantId injection', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?tenantId[]=${ctx.tenantA.id}&tenantId[]=${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });
  });

  // ==========================================================================
  // Request Body Injection
  // ==========================================================================

  describe('Request Body Injection', () => {
    it('rejects tenantId override in request body for create', async () => {
      const response = await apiRequest<{ learner: { id: string; tenantId: string } }>(
        ctx.serverUrl,
        'POST',
        '/api/learners',
        ctx.userA.jwt,
        {
          firstName: 'Injected',
          lastName: 'Learner',
          tenantId: ctx.tenantB.id, // Attempt to inject
          gradeBand: 'K5',
        }
      );

      if (response.status === 201) {
        // Should have Tenant A's ID, not B's
        expect(response.data.learner.tenantId).toBe(ctx.tenantA.id);
        expect(response.data.learner.tenantId).not.toBe(ctx.tenantB.id);
      }
    });

    it('rejects tenantId override in request body for update', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'PATCH',
        `/api/learners/${ctx.learnerA1.id}`,
        ctx.userA.jwt,
        {
          firstName: 'Updated',
          tenantId: ctx.tenantB.id, // Attempt to move to Tenant B
        }
      );

      if (response.status === 200) {
        // Verify learner is still in Tenant A
        const learner = await ctx.db.findLearnerById(ctx.learnerA1.id);
        expect(learner?.tenantId).toBe(ctx.tenantA.id);
      }
    });

    it('rejects nested tenantId injection', async () => {
      const response = await apiRequest(ctx.serverUrl, 'POST', '/api/sessions', ctx.userA.jwt, {
        learnerId: ctx.learnerA1.id,
        sessionType: 'LEARNING',
        metadata: {
          tenantId: ctx.tenantB.id, // Nested injection attempt
        },
      });

      if (response.status === 201) {
        const data = response.data as { session: { tenantId: string } };
        expect(data.session.tenantId).toBe(ctx.tenantA.id);
      }
    });

    it('rejects __proto__ tenantId injection', async () => {
      const response = await apiRequest(ctx.serverUrl, 'POST', '/api/learners', ctx.userA.jwt, {
        firstName: 'Proto',
        lastName: 'Injection',
        __proto__: {
          tenantId: ctx.tenantB.id,
        },
      });

      if (response.status === 201) {
        const data = response.data as { learner: { tenantId: string } };
        expect(data.learner.tenantId).toBe(ctx.tenantA.id);
      }
    });

    it('rejects constructor.prototype injection', async () => {
      const response = await apiRequest(ctx.serverUrl, 'POST', '/api/learners', ctx.userA.jwt, {
        firstName: 'Constructor',
        lastName: 'Injection',
        constructor: {
          prototype: {
            tenantId: ctx.tenantB.id,
          },
        },
      });

      if (response.status === 201) {
        const data = response.data as { learner: { tenantId: string } };
        expect(data.learner.tenantId).toBe(ctx.tenantA.id);
      }
    });
  });

  // ==========================================================================
  // SQL Injection Attempts
  // ==========================================================================

  describe('SQL Injection Attempts', () => {
    it('rejects OR clause injection via search', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?search=' OR tenantId='${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('rejects UNION SELECT injection', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?search=' UNION SELECT * FROM learners WHERE tenantId='${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('rejects comment-based injection', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?id=${ctx.learnerB1.id}--`,
        ctx.userA.jwt
      );

      // Should not return Tenant B data
      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('rejects boolean-based blind injection', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?id=${ctx.learnerA1.id}' AND '1'='1`,
        ctx.userA.jwt
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('rejects time-based injection', async () => {
      const startTime = Date.now();

      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/learners?search='; WAITFOR DELAY '0:0:5'--`,
        ctx.userA.jwt
      );

      const elapsed = Date.now() - startTime;

      // Should not have delayed significantly
      expect(elapsed).toBeLessThan(3000);

      if (response.status === 200) {
        const data = response.data as { learners?: Array<{ tenantId: string }> };
        if (data.learners) {
          assertNoDataLeak(data.learners, ctx.tenantA.id, ctx.tenantB.id);
        }
      }
    });

    it('rejects stacked query injection', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        `/api/learners?id=${ctx.learnerA1.id}'; DELETE FROM learners WHERE tenantId='${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      // Verify Tenant B learners still exist
      const learnerB1 = await ctx.db.findLearnerById(ctx.learnerB1.id);
      expect(learnerB1).not.toBeNull();
    });
  });

  // ==========================================================================
  // Header Attacks
  // ==========================================================================

  describe('Header Attacks', () => {
    it('ignores X-Tenant-ID header from client', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/learners',
        ctx.userA.jwt,
        undefined,
        { 'X-Tenant-ID': ctx.tenantB.id }
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('ignores X-Tenant-Id header (different case)', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/learners',
        ctx.userA.jwt,
        undefined,
        { 'X-Tenant-Id': ctx.tenantB.id }
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('ignores X-Organization-ID header', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/learners',
        ctx.userA.jwt,
        undefined,
        { 'X-Organization-ID': ctx.tenantB.id }
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('ignores Tenant header', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/learners',
        ctx.userA.jwt,
        undefined,
        { Tenant: ctx.tenantB.id }
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('ignores custom tenant headers', async () => {
      const customHeaders = {
        'X-AIVO-Tenant': ctx.tenantB.id,
        'X-Customer-ID': ctx.tenantB.id,
        'X-Account-ID': ctx.tenantB.id,
      };

      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/learners',
        ctx.userA.jwt,
        undefined,
        customHeaders
      );

      if (response.status === 200 && response.data.learners) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }
    });
  });

  // ==========================================================================
  // JWT Manipulation
  // ==========================================================================

  describe('JWT Manipulation', () => {
    it('rejects modified JWT with different tenantId', async () => {
      const tamperedJwt = createTamperedJwt(ctx.userA, ctx.tenantB.id);

      const response = await apiRequest(ctx.serverUrl, 'GET', '/api/learners', tamperedJwt);

      expect(response.status).toBe(401);
    });

    it('rejects JWT with null tenantId', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: ctx.userA.id,
          tenantId: null,
          email: ctx.userA.email,
          role: ctx.userA.role,
        })
      ).toString('base64url');
      const signature = Buffer.from('invalid').toString('base64url');
      const nullTenantJwt = `${header}.${payload}.${signature}`;

      const response = await apiRequest(ctx.serverUrl, 'GET', '/api/learners', nullTenantJwt);

      expect([400, 401]).toContain(response.status);
    });

    it('rejects JWT with empty tenantId', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: ctx.userA.id,
          tenantId: '',
          email: ctx.userA.email,
          role: ctx.userA.role,
        })
      ).toString('base64url');
      const signature = Buffer.from('invalid').toString('base64url');
      const emptyTenantJwt = `${header}.${payload}.${signature}`;

      const response = await apiRequest(ctx.serverUrl, 'GET', '/api/learners', emptyTenantJwt);

      expect([400, 401]).toContain(response.status);
    });

    it('rejects JWT with array tenantId', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: ctx.userA.id,
          tenantId: [ctx.tenantA.id, ctx.tenantB.id],
          email: ctx.userA.email,
          role: ctx.userA.role,
        })
      ).toString('base64url');
      const signature = Buffer.from('invalid').toString('base64url');
      const arrayTenantJwt = `${header}.${payload}.${signature}`;

      const response = await apiRequest(ctx.serverUrl, 'GET', '/api/learners', arrayTenantJwt);

      expect([400, 401]).toContain(response.status);
    });

    it('rejects expired JWT', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: ctx.userA.id,
          tenantId: ctx.tenantA.id,
          email: ctx.userA.email,
          role: ctx.userA.role,
          iat: Math.floor(Date.now() / 1000) - 7200,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        })
      ).toString('base64url');
      const signature = Buffer.from('test-signature').toString('base64url');
      const expiredJwt = `${header}.${payload}.${signature}`;

      const response = await apiRequest(ctx.serverUrl, 'GET', '/api/learners', expiredJwt);

      expect(response.status).toBe(401);
    });

    it('rejects JWT with invalid signature', async () => {
      // Take valid JWT and modify signature
      const parts = ctx.userA.jwt.split('.');
      const invalidJwt = `${parts[0]}.${parts[1]}.invalid_signature`;

      const response = await apiRequest(ctx.serverUrl, 'GET', '/api/learners', invalidJwt);

      expect(response.status).toBe(401);
    });

    it('rejects JWT with none algorithm', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: ctx.userA.id,
          tenantId: ctx.tenantB.id,
          email: ctx.userA.email,
          role: ctx.userA.role,
        })
      ).toString('base64url');
      const noneAlgJwt = `${header}.${payload}.`;

      const response = await apiRequest(ctx.serverUrl, 'GET', '/api/learners', noneAlgJwt);

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // Path Traversal Attacks
  // ==========================================================================

  describe('Path Traversal Attacks', () => {
    it('rejects path traversal in resource ID', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/learners/../tenants/${ctx.tenantB.id}/learners`,
        ctx.userA.jwt
      );

      expect([400, 403, 404]).toContain(response.status);
    });

    it('rejects encoded path traversal', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/learners/%2e%2e/tenants/${ctx.tenantB.id}/learners`,
        ctx.userA.jwt
      );

      expect([400, 403, 404]).toContain(response.status);
    });

    it('rejects double-encoded path traversal', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/learners/%252e%252e/tenants/${ctx.tenantB.id}/learners`,
        ctx.userA.jwt
      );

      expect([400, 403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Mass Assignment Attacks
  // ==========================================================================

  describe('Mass Assignment Attacks', () => {
    it('rejects role escalation via body injection', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'PATCH',
        `/api/users/${ctx.userA.id}`,
        ctx.userA.jwt,
        {
          role: 'PLATFORM_ADMIN',
          tenantId: ctx.tenantB.id,
        }
      );

      // User should not have been modified to PLATFORM_ADMIN or changed tenant
      const user = await ctx.db.findUserById(ctx.userA.id);
      expect(user?.role).toBe('PARENT');
      expect(user?.tenantId).toBe(ctx.tenantA.id);
    });

    it('rejects isAdmin flag injection', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'PATCH',
        `/api/users/${ctx.userA.id}`,
        ctx.userA.jwt,
        {
          isAdmin: true,
          isSuperAdmin: true,
        }
      );

      const user = await ctx.db.findUserById(ctx.userA.id);
      expect(user?.role).toBe('PARENT');
    });
  });

  // ==========================================================================
  // IDOR (Insecure Direct Object Reference) Attacks
  // ==========================================================================

  describe('IDOR Attacks', () => {
    it('prevents accessing resources by guessing sequential IDs', async () => {
      // Try to access resources with sequential ID patterns
      const guessedIds = [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '1',
        '2',
        'admin',
        'root',
      ];

      for (const id of guessedIds) {
        const response = await apiRequest(
          ctx.serverUrl,
          'GET',
          `/api/learners/${id}`,
          ctx.userA.jwt
        );

        // Should not return data from other tenants
        if (response.status === 200) {
          const data = response.data as { learner?: { tenantId: string } };
          if (data.learner) {
            expect(data.learner.tenantId).toBe(ctx.tenantA.id);
          }
        }
      }
    });

    it('prevents enumeration of tenant IDs', async () => {
      const response = await apiRequest(ctx.serverUrl, 'GET', '/api/tenants', ctx.userA.jwt);

      // Regular users should not be able to list all tenants
      if (response.status === 200) {
        const data = response.data as { tenants?: Array<{ id: string }> };
        if (data.tenants) {
          // Should only see own tenant
          expect(data.tenants.length).toBeLessThanOrEqual(1);
          expect(data.tenants.every((t) => t.id === ctx.tenantA.id)).toBe(true);
        }
      } else {
        expect([403, 404]).toContain(response.status);
      }
    });
  });

  // ==========================================================================
  // GraphQL-style Attacks (if applicable)
  // ==========================================================================

  describe('GraphQL-style Attacks', () => {
    it('rejects batched queries across tenants', async () => {
      const response = await apiRequest(ctx.serverUrl, 'POST', '/api/graphql', ctx.userA.jwt, {
        query: `
          query {
            learnerA: learner(id: "${ctx.learnerA1.id}") { id tenantId }
            learnerB: learner(id: "${ctx.learnerB1.id}") { id tenantId }
          }
        `,
      });

      if (response.status === 200) {
        const data = response.data as {
          data?: { learnerA?: { tenantId: string }; learnerB?: { tenantId: string } };
        };
        // learnerB should be null or not present
        expect(data.data?.learnerB).toBeFalsy();
        if (data.data?.learnerA) {
          expect(data.data.learnerA.tenantId).toBe(ctx.tenantA.id);
        }
      }
    });

    it('rejects introspection for cross-tenant data', async () => {
      const response = await apiRequest(ctx.serverUrl, 'POST', '/api/graphql', ctx.userA.jwt, {
        query: `
          query {
            __schema {
              types {
                name
              }
            }
          }
        `,
      });

      // Introspection should either be disabled or not leak tenant info
      // This test just ensures the query doesn't error and expose information
      expect([200, 400, 403]).toContain(response.status);
    });
  });
});
