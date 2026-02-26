/**
 * Authorization Escalation Security Test Suite
 *
 * Tests for OWASP A01:2021 - Broken Access Control.
 *
 * Validates that users cannot escalate privileges or access
 * resources belonging to other users/tenants (vertical & horizontal).
 *
 * @module tests/security/authorization-escalation.security.test
 */

import { describe, it, expect } from 'vitest';
import { SECURITY_TEST_CONFIG } from './setup.js';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = SECURITY_TEST_CONFIG.apiBaseUrl;

// Role hierarchy in AIVO (lowest → highest)
const ROLES = {
  LEARNER: 'LEARNER',
  PARENT: 'PARENT',
  TEACHER: 'TEACHER',
  DISTRICT_ADMIN: 'DISTRICT_ADMIN',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

// Endpoints restricted by role
const ROLE_RESTRICTED_ENDPOINTS = [
  // Admin-only endpoints
  { method: 'GET', path: '/api/v1/admin/users', minRole: 'ADMIN' },
  { method: 'POST', path: '/api/v1/admin/users', minRole: 'ADMIN' },
  { method: 'DELETE', path: '/api/v1/admin/users/123', minRole: 'ADMIN' },
  { method: 'GET', path: '/api/v1/admin/settings', minRole: 'ADMIN' },
  { method: 'PUT', path: '/api/v1/admin/settings', minRole: 'ADMIN' },
  { method: 'GET', path: '/api/v1/admin/audit-log', minRole: 'ADMIN' },

  // District admin endpoints
  { method: 'GET', path: '/api/v1/districts/123/teachers', minRole: 'DISTRICT_ADMIN' },
  { method: 'POST', path: '/api/v1/districts/123/invite', minRole: 'DISTRICT_ADMIN' },
  { method: 'PUT', path: '/api/v1/districts/123/settings', minRole: 'DISTRICT_ADMIN' },
  { method: 'GET', path: '/api/v1/districts/123/billing', minRole: 'DISTRICT_ADMIN' },

  // Teacher-only endpoints
  { method: 'POST', path: '/api/v1/lessons', minRole: 'TEACHER' },
  { method: 'PUT', path: '/api/v1/lessons/123', minRole: 'TEACHER' },
  { method: 'DELETE', path: '/api/v1/lessons/123', minRole: 'TEACHER' },
  { method: 'GET', path: '/api/v1/classrooms/123/students', minRole: 'TEACHER' },
  { method: 'POST', path: '/api/v1/assignments', minRole: 'TEACHER' },
  { method: 'GET', path: '/api/v1/analytics/classroom/123', minRole: 'TEACHER' },

  // Billing/payment endpoints
  { method: 'GET', path: '/api/v1/billing/invoices', minRole: 'ADMIN' },
  { method: 'POST', path: '/api/v1/billing/subscription', minRole: 'ADMIN' },
  { method: 'DELETE', path: '/api/v1/billing/subscription', minRole: 'ADMIN' },
];

// IDOR test vectors — accessing other users' resources
const IDOR_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/users/{userId}/profile', param: 'userId' },
  { method: 'PUT', path: '/api/v1/users/{userId}/profile', param: 'userId' },
  { method: 'GET', path: '/api/v1/users/{userId}/grades', param: 'userId' },
  { method: 'GET', path: '/api/v1/users/{userId}/progress', param: 'userId' },
  { method: 'GET', path: '/api/v1/users/{userId}/submissions', param: 'userId' },
  { method: 'GET', path: '/api/v1/users/{userId}/analytics', param: 'userId' },
  { method: 'DELETE', path: '/api/v1/users/{userId}', param: 'userId' },
];

// Tenant isolation test vectors
const TENANT_ISOLATION_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/tenants/{tenantId}/users', param: 'tenantId' },
  { method: 'GET', path: '/api/v1/tenants/{tenantId}/lessons', param: 'tenantId' },
  { method: 'GET', path: '/api/v1/tenants/{tenantId}/settings', param: 'tenantId' },
  { method: 'GET', path: '/api/v1/tenants/{tenantId}/billing', param: 'tenantId' },
  { method: 'GET', path: '/api/v1/tenants/{tenantId}/analytics', param: 'tenantId' },
];

// =============================================================================
// Helper Functions
// =============================================================================

interface ApiResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
  error?: string;
}

async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse> {
  try {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    return { status: response.status, data, headers: responseHeaders };
  } catch (error) {
    return {
      status: 0,
      data: null,
      headers: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function createMockJWT(
  payload: Record<string, unknown>,
  header?: Record<string, unknown>
): string {
  const h = { alg: 'RS256', typ: 'JWT', ...header };
  const encodedHeader = Buffer.from(JSON.stringify(h)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mockSignature = Buffer.from('mock-signature-for-test').toString('base64url');
  return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
}

function createTokenForRole(role: string, userId: string = 'user-123'): string {
  return createMockJWT({
    sub: userId,
    email: `${role.toLowerCase()}@example.com`,
    role,
    tenantId: 'tenant-1',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  });
}

// =============================================================================
// Vertical Privilege Escalation Tests
// =============================================================================

describe('Authorization Escalation Security Tests', () => {
  describe('Vertical Privilege Escalation', () => {
    describe('Learner accessing admin endpoints', () => {
      const learnerToken = createTokenForRole(ROLES.LEARNER);

      it.each(ROLE_RESTRICTED_ENDPOINTS.filter((e) => e.minRole === 'ADMIN'))(
        'LEARNER should NOT access admin endpoint: $method $path',
        async ({ method, path }) => {
          const response = await makeRequest(path, method, undefined, {
            Authorization: `Bearer ${learnerToken}`,
          });

          expect([401, 403]).toContain(response.status);
        }
      );
    });

    describe('Learner accessing teacher endpoints', () => {
      const learnerToken = createTokenForRole(ROLES.LEARNER);

      it.each(ROLE_RESTRICTED_ENDPOINTS.filter((e) => e.minRole === 'TEACHER'))(
        'LEARNER should NOT access teacher endpoint: $method $path',
        async ({ method, path }) => {
          const response = await makeRequest(path, method, undefined, {
            Authorization: `Bearer ${learnerToken}`,
          });

          expect([401, 403]).toContain(response.status);
        }
      );
    });

    describe('Teacher accessing admin endpoints', () => {
      const teacherToken = createTokenForRole(ROLES.TEACHER);

      it.each(ROLE_RESTRICTED_ENDPOINTS.filter((e) => e.minRole === 'ADMIN'))(
        'TEACHER should NOT access admin endpoint: $method $path',
        async ({ method, path }) => {
          const response = await makeRequest(path, method, undefined, {
            Authorization: `Bearer ${teacherToken}`,
          });

          expect([401, 403]).toContain(response.status);
        }
      );
    });

    describe('Parent accessing teacher endpoints', () => {
      const parentToken = createTokenForRole(ROLES.PARENT);

      it.each(ROLE_RESTRICTED_ENDPOINTS.filter((e) => e.minRole === 'TEACHER'))(
        'PARENT should NOT access teacher endpoint: $method $path',
        async ({ method, path }) => {
          const response = await makeRequest(path, method, undefined, {
            Authorization: `Bearer ${parentToken}`,
          });

          expect([401, 403]).toContain(response.status);
        }
      );
    });
  });

  // =============================================================================
  // Role Manipulation Tests
  // =============================================================================

  describe('Role Manipulation', () => {
    it('should REJECT role change via profile update', async () => {
      const learnerToken = createTokenForRole(ROLES.LEARNER);

      const response = await makeRequest('/api/v1/users/me', 'PUT', {
        role: 'ADMIN',
      }, {
        Authorization: `Bearer ${learnerToken}`,
      });

      // Should either reject or ignore the role field
      if (response.status === 200) {
        const data = response.data as Record<string, unknown>;
        expect(data.role).not.toBe('ADMIN');
      }
    });

    it('should REJECT role change via JWT claim manipulation', async () => {
      const manipulatedToken = createTokenForRole(ROLES.ADMIN, 'learner-user-id');

      const response = await makeRequest('/api/v1/admin/users', 'GET', undefined, {
        Authorization: `Bearer ${manipulatedToken}`,
      });

      // Manipulated JWTs should be rejected (signature invalid)
      expect([401, 403]).toContain(response.status);
    });

    it('should REJECT permission escalation via request body', async () => {
      const learnerToken = createTokenForRole(ROLES.LEARNER);

      const response = await makeRequest('/api/v1/users/me', 'PUT', {
        permissions: ['admin:*', 'users:manage', 'billing:manage'],
        isAdmin: true,
        isSuperAdmin: true,
      }, {
        Authorization: `Bearer ${learnerToken}`,
      });

      // Should not grant elevated permissions
      if (response.status === 200) {
        const data = response.data as Record<string, unknown>;
        expect(data).not.toHaveProperty('permissions');
        expect(data).not.toHaveProperty('isAdmin', true);
      }
    });

    it('should REJECT role escalation via GraphQL (if applicable)', async () => {
      const learnerToken = createTokenForRole(ROLES.LEARNER);

      const response = await makeRequest('/graphql', 'POST', {
        query: `mutation { updateUser(id: "me", role: "ADMIN") { id role } }`,
      }, {
        Authorization: `Bearer ${learnerToken}`,
      });

      // Should reject role escalation
      expect([400, 401, 403]).toContain(response.status);
    });
  });

  // =============================================================================
  // Horizontal Privilege Escalation (IDOR) Tests
  // =============================================================================

  describe('Horizontal Privilege Escalation (IDOR)', () => {
    const userToken = createTokenForRole(ROLES.LEARNER, 'user-123');
    const otherUserId = 'user-456';

    it.each(IDOR_ENDPOINTS)(
      'should NOT allow access to another user resource: $method $path',
      async ({ method, path, param }) => {
        const targetPath = path.replace(`{${param}}`, otherUserId);

        const response = await makeRequest(targetPath, method, undefined, {
          Authorization: `Bearer ${userToken}`,
        });

        // Should be forbidden (not just 404 — must NOT leak data)
        expect([401, 403, 404]).toContain(response.status);
      }
    );

    it('should NOT allow accessing other users via UUID enumeration', async () => {
      const userToken = createTokenForRole(ROLES.LEARNER, 'user-123');

      // Try sequential UUIDs
      const uuids = [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
      ];

      for (const uuid of uuids) {
        const response = await makeRequest(`/api/v1/users/${uuid}/profile`, 'GET', undefined, {
          Authorization: `Bearer ${userToken}`,
        });

        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('should NOT allow modifying other users data', async () => {
      const userToken = createTokenForRole(ROLES.LEARNER, 'user-123');

      const response = await makeRequest(`/api/v1/users/${otherUserId}/profile`, 'PUT', {
        firstName: 'Hacked',
        lastName: 'Account',
      }, {
        Authorization: `Bearer ${userToken}`,
      });

      expect([401, 403]).toContain(response.status);
    });

    it('should NOT allow deleting other users resources', async () => {
      const userToken = createTokenForRole(ROLES.LEARNER, 'user-123');

      const response = await makeRequest(`/api/v1/users/${otherUserId}`, 'DELETE', undefined, {
        Authorization: `Bearer ${userToken}`,
      });

      expect([401, 403]).toContain(response.status);
    });
  });

  // =============================================================================
  // Tenant Isolation Tests
  // =============================================================================

  describe('Tenant Isolation', () => {
    const tenantAToken = createMockJWT({
      sub: 'user-a',
      tenantId: 'tenant-A',
      role: 'ADMIN',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    it.each(TENANT_ISOLATION_ENDPOINTS)(
      'should NOT allow cross-tenant access: $method $path',
      async ({ method, path, param }) => {
        const targetPath = path.replace(`{${param}}`, 'tenant-B');

        const response = await makeRequest(targetPath, method, undefined, {
          Authorization: `Bearer ${tenantAToken}`,
        });

        // Should be forbidden for cross-tenant access
        expect([401, 403]).toContain(response.status);
      }
    );

    it('should NOT allow tenant override via request body', async () => {
      const response = await makeRequest('/api/v1/lessons', 'POST', {
        title: 'Test Lesson',
        tenantId: 'tenant-B', // Attempting cross-tenant injection
      }, {
        Authorization: `Bearer ${tenantAToken}`,
      });

      // Should either reject or ignore the tenant override
      if (response.status === 201 || response.status === 200) {
        const data = response.data as Record<string, unknown>;
        expect(data).not.toHaveProperty('tenantId', 'tenant-B');
      }
    });

    it('should NOT allow tenant override via query parameter', async () => {
      const response = await makeRequest(
        '/api/v1/users?tenantId=tenant-B',
        'GET',
        undefined,
        { Authorization: `Bearer ${tenantAToken}` }
      );

      // Should either reject or ignore tenant param
      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as { items?: { tenantId?: string }[] };
        if (data.items) {
          for (const item of data.items) {
            expect(item.tenantId).not.toBe('tenant-B');
          }
        }
      }
    });

    it('should NOT allow tenant override via header', async () => {
      const response = await makeRequest('/api/v1/users', 'GET', undefined, {
        Authorization: `Bearer ${tenantAToken}`,
        'X-Tenant-ID': 'tenant-B',
      });

      // Should either ignore the header or reject
      if (response.status === 200) {
        const data = response.data as { items?: { tenantId?: string }[] };
        if (data.items) {
          for (const item of data.items) {
            expect(item.tenantId).not.toBe('tenant-B');
          }
        }
      }
    });
  });

  // =============================================================================
  // Function-Level Access Control Tests
  // =============================================================================

  describe('Function-Level Access Control', () => {
    it('should NOT expose admin API documentation to non-admins', async () => {
      const response = await makeRequest('/api/v1/admin/docs');

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should NOT expose internal debug endpoints', async () => {
      const debugEndpoints = [
        '/debug',
        '/api/debug',
        '/api/v1/debug',
        '/_debug',
        '/internal',
        '/api/internal',
        '/__admin',
      ];

      for (const endpoint of debugEndpoints) {
        const response = await makeRequest(endpoint);
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('should NOT expose metrics endpoint without auth', async () => {
      const response = await makeRequest('/metrics');

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should NOT expose environment variables', async () => {
      const envEndpoints = [
        '/api/v1/env',
        '/api/v1/config',
        '/api/v1/debug/env',
        '/.env',
        '/env.json',
      ];

      for (const endpoint of envEndpoints) {
        const response = await makeRequest(endpoint);
        expect([401, 403, 404]).toContain(response.status);

        // Should never contain sensitive env data
        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toMatch(/DATABASE_URL|SECRET_KEY|API_KEY|PASSWORD/i);
      }
    });
  });

  // =============================================================================
  // Data Filtering Tests
  // =============================================================================

  describe('Response Data Filtering', () => {
    it('should NOT include password hashes in user responses', async () => {
      const adminToken = createTokenForRole(ROLES.ADMIN);

      const response = await makeRequest('/api/v1/admin/users', 'GET', undefined, {
        Authorization: `Bearer ${adminToken}`,
      });

      const responseStr = JSON.stringify(response.data);
      expect(responseStr).not.toMatch(/passwordHash|password_hash|\$2[aby]\$/i);
    });

    it('should NOT include internal IDs in public responses', async () => {
      const response = await makeRequest('/api/v1/lessons', 'GET');

      if (response.status === 200) {
        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toMatch(/internalId|_id|__v/i);
      }
    });

    it('should NOT include other tenants data in listings', async () => {
      const tenantToken = createMockJWT({
        sub: 'user-1',
        tenantId: 'tenant-1',
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const response = await makeRequest('/api/v1/users', 'GET', undefined, {
        Authorization: `Bearer ${tenantToken}`,
      });

      if (response.status === 200) {
        const data = response.data as { items?: { tenantId?: string }[] };
        if (data.items) {
          for (const item of data.items) {
            if (item.tenantId) {
              expect(item.tenantId).toBe('tenant-1');
            }
          }
        }
      }
    });
  });
});

// =============================================================================
// Test Statistics
// =============================================================================

/**
 * Test Count Summary:
 * - Vertical Escalation (Learner→Admin): ~6 tests
 * - Vertical Escalation (Learner→Teacher): ~6 tests
 * - Vertical Escalation (Teacher→Admin): ~6 tests
 * - Vertical Escalation (Parent→Teacher): ~6 tests
 * - Role Manipulation: ~4 tests
 * - Horizontal Escalation (IDOR): ~11 tests
 * - Tenant Isolation: ~8 tests
 * - Function-Level Access Control: ~4 tests
 * - Response Data Filtering: ~3 tests
 *
 * Total: 54+ test cases for authorization escalation
 */
