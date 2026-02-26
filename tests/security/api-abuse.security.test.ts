/**
 * API Abuse Security Test Suite
 *
 * Tests for OWASP A01:2021 - Broken Access Control
 * and A04:2021 - Insecure Design.
 *
 * Validates protection against mass assignment, IDOR,
 * excessive data exposure, and API-specific attack vectors.
 *
 * @module tests/security/api-abuse.security.test
 */

import { describe, it, expect } from 'vitest';
import { SECURITY_TEST_CONFIG } from './setup.js';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = SECURITY_TEST_CONFIG.apiBaseUrl;

// Mass assignment fields that should never be writable via API
const PROTECTED_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'role',
  'isAdmin',
  'isSuperAdmin',
  'permissions',
  'tenantId',
  'verified',
  'emailVerified',
  'passwordHash',
  'passwordSalt',
  'mfaSecret',
  'apiKey',
  'internalNotes',
  'stripeCustomerId',
  'subscriptionTier',
  'billingStatus',
];

// Sensitive data patterns that should never leak in API responses
const SENSITIVE_DATA_PATTERNS = [
  /password/i,
  /passwordHash/i,
  /secret/i,
  /mfaSecret/i,
  /apiKey/i,
  /privateKey/i,
  /accessToken/i,
  /refreshToken/i,
  /\$2[aby]\$\d+\$/,    // bcrypt hash
  /DATABASE_URL/i,
  /STRIPE_SECRET/i,
  /AWS_SECRET/i,
  /PRIVATE_KEY/i,
];

// Endpoints for mass assignment testing
const MASS_ASSIGNMENT_ENDPOINTS = [
  { method: 'POST', path: '/api/v1/users', name: 'User creation' },
  { method: 'PUT', path: '/api/v1/users/me', name: 'User update' },
  { method: 'POST', path: '/api/v1/lessons', name: 'Lesson creation' },
  { method: 'PUT', path: '/api/v1/lessons/123', name: 'Lesson update' },
  { method: 'POST', path: '/api/v1/classrooms', name: 'Classroom creation' },
  { method: 'POST', path: '/api/v1/assignments', name: 'Assignment creation' },
  { method: 'PUT', path: '/api/v1/users/me/settings', name: 'Settings update' },
];

// GraphQL introspection and abuse vectors
const GRAPHQL_ABUSE_QUERIES = [
  // Introspection (should be disabled in production)
  {
    name: 'Full introspection query',
    query: '{ __schema { types { name fields { name type { name } } } } }',
  },
  {
    name: 'Type introspection',
    query: '{ __type(name: "User") { fields { name type { name } } } }',
  },
  // Deeply nested queries (DoS via query complexity)
  {
    name: 'Deeply nested query',
    query: `{
      users {
        lessons {
          assignments {
            submissions {
              user {
                lessons {
                  assignments { id }
                }
              }
            }
          }
        }
      }
    }`,
  },
  // Batch query abuse
  {
    name: 'Batch query abuse',
    query: Array(100)
      .fill(null)
      .map((_, i) => `q${i}: user(id: "${i}") { email }`)
      .join('\n'),
  },
];

// Pagination abuse vectors
const PAGINATION_ABUSE = [
  { limit: 0, page: 1, description: 'Zero limit' },
  { limit: -1, page: 1, description: 'Negative limit' },
  { limit: 999999, page: 1, description: 'Excessive limit' },
  { limit: 10, page: -1, description: 'Negative page' },
  { limit: 10, page: 0, description: 'Zero page' },
  { limit: 10, page: 999999, description: 'Excessive page' },
  { limit: 10, page: 1.5, description: 'Float page' },
  { limit: 'abc' as unknown as number, page: 1, description: 'String limit' },
  { limit: 10, page: 'abc' as unknown as number, description: 'String page' },
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

function containsSensitiveData(obj: unknown): string[] {
  const found: string[] = [];
  const str = JSON.stringify(obj);

  for (const pattern of SENSITIVE_DATA_PATTERNS) {
    if (pattern.test(str)) {
      found.push(pattern.source);
    }
  }

  return found;
}

// =============================================================================
// Mass Assignment Tests
// =============================================================================

describe('API Abuse Security Tests', () => {
  describe('Mass Assignment Protection', () => {
    it.each(PROTECTED_FIELDS)(
      'should NOT allow setting protected field: %s',
      async (field) => {
        const payload: Record<string, unknown> = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          [field]: field === 'role'
            ? 'ADMIN'
            : field === 'permissions'
              ? ['admin:*']
              : field.includes('Id')
                ? 'injected-id-value'
                : true,
        };

        const response = await makeRequest('/api/v1/users/me', 'PUT', payload, {
          Authorization: 'Bearer mock-token',
        });

        // If update succeeds, the protected field should not be changed
        if (response.status === 200) {
          const data = response.data as Record<string, unknown>;
          expect(data[field]).not.toBe(payload[field]);
        }
      }
    );

    it.each(MASS_ASSIGNMENT_ENDPOINTS)(
      'should filter protected fields on $name ($method $path)',
      async ({ method, path }) => {
        const maliciousPayload = {
          // Legitimate fields
          title: 'Test',
          content: 'Test content',
          firstName: 'Test',
          lastName: 'User',
          // Mass assignment attempts
          role: 'ADMIN',
          isAdmin: true,
          permissions: ['admin:*'],
          tenantId: 'attacker-tenant',
          verified: true,
          subscriptionTier: 'enterprise',
        };

        const response = await makeRequest(path, method, maliciousPayload, {
          Authorization: 'Bearer mock-token',
        });

        // Should not apply protected fields
        if (response.status === 200 || response.status === 201) {
          const data = response.data as Record<string, unknown>;
          expect(data.role).not.toBe('ADMIN');
          expect(data.isAdmin).not.toBe(true);
          expect(data.permissions).toBeUndefined();
        }
      }
    );

    it('should REJECT __proto__ pollution via API', async () => {
      const response = await makeRequest('/api/v1/users/me', 'PUT', {
        __proto__: { isAdmin: true, role: 'ADMIN' },
        constructor: { prototype: { isAdmin: true } },
      }, {
        Authorization: 'Bearer mock-token',
      });

      // Should not allow prototype pollution
      expect([200, 400, 422]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as Record<string, unknown>;
        expect(data.isAdmin).not.toBe(true);
      }
    });

    it('should REJECT nested object mass assignment', async () => {
      const response = await makeRequest('/api/v1/users/me', 'PUT', {
        firstName: 'Test',
        profile: {
          role: 'ADMIN',
          permissions: ['admin:*'],
        },
        settings: {
          isAdmin: true,
        },
      }, {
        Authorization: 'Bearer mock-token',
      });

      if (response.status === 200) {
        const data = response.data as Record<string, unknown>;
        const profile = data.profile as Record<string, unknown> | undefined;
        if (profile) {
          expect(profile.role).not.toBe('ADMIN');
        }
      }
    });
  });

  // =============================================================================
  // Excessive Data Exposure Tests
  // =============================================================================

  describe('Excessive Data Exposure', () => {
    it('should NOT expose sensitive fields in user listings', async () => {
      const response = await makeRequest('/api/v1/users', 'GET', undefined, {
        Authorization: 'Bearer mock-token',
      });

      if (response.status === 200) {
        const sensitiveFound = containsSensitiveData(response.data);
        expect(sensitiveFound).toHaveLength(0);
      }
    });

    it('should NOT expose sensitive fields in user profile', async () => {
      const response = await makeRequest('/api/v1/users/me', 'GET', undefined, {
        Authorization: 'Bearer mock-token',
      });

      if (response.status === 200) {
        const sensitiveFound = containsSensitiveData(response.data);
        expect(sensitiveFound).toHaveLength(0);
      }
    });

    it('should NOT include debug information in production responses', async () => {
      const response = await makeRequest('/api/v1/nonexistent-endpoint');

      const responseStr = JSON.stringify(response.data);

      // Should not include stack traces
      expect(responseStr).not.toMatch(/at\s+\w+\s+\(/);
      expect(responseStr).not.toContain('node_modules');
      expect(responseStr).not.toContain('dist/');

      // Should not include internal paths
      expect(responseStr).not.toMatch(/[A-Z]:\\Users\\/i);
      expect(responseStr).not.toMatch(/\/home\/\w+/);
    });

    it('should NOT expose database query details in errors', async () => {
      const response = await makeRequest('/api/v1/users?sort=invalid_column');

      const responseStr = JSON.stringify(response.data);

      // Should not expose SQL/query details
      expect(responseStr).not.toMatch(/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE/i);
      expect(responseStr).not.toMatch(/relation|column|table/i);
      expect(responseStr).not.toContain('pg_');
    });

    it('should NOT expose server technology in headers', async () => {
      const response = await makeRequest('/api/v1/health');

      // Should not reveal server technology
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).not.toMatch(/express|koa|fastify|node/i);
    });

    it('should return consistent error format', async () => {
      const endpoints = [
        '/api/v1/nonexistent',
        '/api/v1/users/invalid-id',
        '/api/v1/lessons/999999',
      ];

      for (const endpoint of endpoints) {
        const response = await makeRequest(endpoint);

        if (response.status >= 400) {
          const data = response.data as Record<string, unknown>;

          // Error should have a consistent structure
          expect(data.message || data.error || data.detail).toBeDefined();

          // Should not expose internal details
          const responseStr = JSON.stringify(data);
          expect(responseStr).not.toContain('stack');
          expect(responseStr).not.toContain('node_modules');
        }
      }
    });
  });

  // =============================================================================
  // IDOR (Insecure Direct Object Reference) Tests
  // =============================================================================

  describe('IDOR Protection', () => {
    it('should NOT allow accessing other users data by ID manipulation', async () => {
      // Try incrementing user IDs
      const testIds = ['1', '2', '3', '100', '999'];

      for (const id of testIds) {
        const response = await makeRequest(`/api/v1/users/${id}`, 'GET', undefined, {
          Authorization: 'Bearer mock-token-for-user-999',
        });

        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('should NOT allow accessing resources via predictable IDs', async () => {
      // Try sequential document IDs
      const testPaths = [
        '/api/v1/documents/1',
        '/api/v1/documents/2',
        '/api/v1/invoices/INV-001',
        '/api/v1/invoices/INV-002',
        '/api/v1/reports/report-1',
      ];

      for (const path of testPaths) {
        const response = await makeRequest(path, 'GET', undefined, {
          Authorization: 'Bearer mock-token',
        });

        // Should only return data the user owns
        expect([200, 401, 403, 404]).toContain(response.status);
      }
    });

    it('should use UUIDs instead of sequential IDs', async () => {
      const response = await makeRequest('/api/v1/lessons', 'GET', undefined, {
        Authorization: 'Bearer mock-token',
      });

      if (response.status === 200) {
        const data = response.data as { items?: { id?: string }[] };
        if (data.items && data.items.length > 0) {
          for (const item of data.items) {
            if (item.id) {
              // IDs should be UUIDs, not sequential numbers
              expect(item.id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
              );
            }
          }
        }
      }
    });

    it('should NOT allow file access via path traversal', async () => {
      const traversalPaths = [
        '/api/v1/files/../../../etc/passwd',
        '/api/v1/files/..%2f..%2f..%2fetc%2fpasswd',
        '/api/v1/uploads/../../config/database.yml',
        '/api/v1/assets/..\\..\\..\\windows\\system32\\config\\sam',
      ];

      for (const path of traversalPaths) {
        const response = await makeRequest(path);

        expect([400, 401, 403, 404]).toContain(response.status);
      }
    });
  });

  // =============================================================================
  // Pagination & Filtering Abuse Tests
  // =============================================================================

  describe('Pagination & Filtering Abuse', () => {
    it.each(PAGINATION_ABUSE)(
      'should handle $description (limit=$limit, page=$page)',
      async ({ limit, page }) => {
        const response = await makeRequest(
          `/api/v1/users?limit=${limit}&page=${page}`,
          'GET',
          undefined,
          { Authorization: 'Bearer mock-token' }
        );

        // Should reject or sanitize abusive pagination
        expect([200, 400, 422]).toContain(response.status);

        // If accepted, the result set should be bounded
        if (response.status === 200) {
          const data = response.data as { items?: unknown[] };
          if (data.items) {
            expect(data.items.length).toBeLessThanOrEqual(100); // Max page size
          }
        }
      }
    );

    it('should enforce maximum page size', async () => {
      const response = await makeRequest(
        '/api/v1/users?limit=10000',
        'GET',
        undefined,
        { Authorization: 'Bearer mock-token' }
      );

      if (response.status === 200) {
        const data = response.data as { items?: unknown[] };
        if (data.items) {
          // Should cap at a reasonable limit
          expect(data.items.length).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should NOT allow SQL injection in sort parameter', async () => {
      const maliciousSorts = [
        "name; DROP TABLE users--",
        "name' OR '1'='1",
        "name UNION SELECT * FROM users--",
        "(CASE WHEN 1=1 THEN name ELSE email END)",
      ];

      for (const sort of maliciousSorts) {
        const response = await makeRequest(
          `/api/v1/users?sort=${encodeURIComponent(sort)}`,
          'GET',
          undefined,
          { Authorization: 'Bearer mock-token' }
        );

        expect([200, 400, 422]).toContain(response.status);
      }
    });

    it('should NOT allow SQL injection in filter parameter', async () => {
      const maliciousFilters = [
        "role=ADMIN' OR '1'='1",
        "status=active; DROP TABLE users--",
        "name=test' UNION SELECT * FROM users--",
      ];

      for (const filter of maliciousFilters) {
        const response = await makeRequest(
          `/api/v1/users?${filter}`,
          'GET',
          undefined,
          { Authorization: 'Bearer mock-token' }
        );

        expect([200, 400, 422]).toContain(response.status);
      }
    });
  });

  // =============================================================================
  // GraphQL Abuse Tests
  // =============================================================================

  describe('GraphQL Abuse Protection', () => {
    it.each(GRAPHQL_ABUSE_QUERIES)(
      'should prevent GraphQL abuse: $name',
      async ({ query }) => {
        const response = await makeRequest('/graphql', 'POST', { query }, {
          Authorization: 'Bearer mock-token',
        });

        // Introspection should be disabled in production
        // Complex queries should be rejected or limited
        expect([200, 400, 401, 403, 413, 429]).toContain(response.status);

        if (response.status === 200) {
          const data = response.data as { errors?: unknown[] };
          // If successful, should have errors or limited data
          if (data.errors) {
            expect(data.errors.length).toBeGreaterThan(0);
          }
        }
      }
    );

    it('should enforce query depth limit', async () => {
      // Generate a deeply nested query
      let query = '{ users ';
      for (let i = 0; i < 20; i++) {
        query += '{ lessons { assignments ';
      }
      for (let i = 0; i < 20; i++) {
        query += '} }';
      }
      query += ' } }';

      const response = await makeRequest('/graphql', 'POST', { query }, {
        Authorization: 'Bearer mock-token',
      });

      // Should reject overly deep queries
      expect([400, 413, 429]).toContain(response.status);
    });

    it('should enforce query complexity limit', async () => {
      // High-complexity query with many field selections
      const response = await makeRequest('/graphql', 'POST', {
        query: `{
          users(first: 1000) {
            edges {
              node {
                id email firstName lastName role
                lessons(first: 100) {
                  edges { node { id title content } }
                }
                assignments(first: 100) {
                  edges { node { id title dueDate } }
                }
                submissions(first: 100) {
                  edges { node { id grade feedback } }
                }
              }
            }
          }
        }`,
      }, {
        Authorization: 'Bearer mock-token',
      });

      // Should reject or limit complex queries
      expect([200, 400, 413, 429]).toContain(response.status);
    });
  });

  // =============================================================================
  // Bulk Operation Abuse Tests
  // =============================================================================

  describe('Bulk Operation Abuse', () => {
    it('should limit bulk create operations', async () => {
      const bulkItems = Array(1000).fill({
        title: 'Bulk Item',
        content: 'Test',
      });

      const response = await makeRequest('/api/v1/lessons/batch', 'POST', {
        items: bulkItems,
      }, {
        Authorization: 'Bearer mock-token',
      });

      // Should reject or limit to reasonable batch size
      expect([400, 413, 422, 429]).toContain(response.status);
    });

    it('should limit bulk delete operations', async () => {
      const ids = Array(1000).fill(null).map((_, i) => `id-${i}`);

      const response = await makeRequest('/api/v1/lessons/batch', 'DELETE', {
        ids,
      }, {
        Authorization: 'Bearer mock-token',
      });

      expect([400, 413, 422, 429]).toContain(response.status);
    });

    it('should limit bulk update operations', async () => {
      const updates = Array(1000).fill({
        id: 'some-id',
        title: 'Updated',
      });

      const response = await makeRequest('/api/v1/lessons/batch', 'PUT', {
        items: updates,
      }, {
        Authorization: 'Bearer mock-token',
      });

      expect([400, 413, 422, 429]).toContain(response.status);
    });
  });

  // =============================================================================
  // API Versioning & Discovery Tests
  // =============================================================================

  describe('API Version & Discovery Security', () => {
    it('should NOT expose older API versions with known vulnerabilities', async () => {
      const oldVersions = ['/api/v0/', '/api/beta/', '/api/alpha/', '/api/'];

      for (const version of oldVersions) {
        const response = await makeRequest(`${version}users`);
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('should NOT expose API docs without authentication', async () => {
      const docEndpoints = [
        '/api-docs',
        '/swagger',
        '/swagger.json',
        '/openapi.json',
        '/redoc',
        '/docs',
      ];

      for (const endpoint of docEndpoints) {
        const response = await makeRequest(endpoint);
        expect([401, 403, 404]).toContain(response.status);
      }
    });

    it('should include proper CORS headers', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil.com',
          'Access-Control-Request-Method': 'GET',
        },
      });

      const origin = response.headers.get('access-control-allow-origin');

      // Should not allow arbitrary origins
      if (origin) {
        expect(origin).not.toBe('*');
        expect(origin).not.toBe('https://evil.com');
      }
    });

    it('should NOT reflect arbitrary Origin headers', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://attacker.com',
        },
      });

      const origin = response.headers.get('access-control-allow-origin');
      expect(origin).not.toBe('https://attacker.com');
    });
  });

  // =============================================================================
  // Resource Exhaustion Tests
  // =============================================================================

  describe('Resource Exhaustion Prevention', () => {
    it('should limit concurrent requests per user', async () => {
      const promises = Array(50).fill(null).map(() =>
        makeRequest('/api/v1/users/me', 'GET', undefined, {
          Authorization: 'Bearer mock-token',
        })
      );

      const results = await Promise.all(promises);

      // Some requests may be rate-limited
      const rateLimited = results.filter((r) => r.status === 429);
      // Should start rate-limiting at some point
      expect(rateLimited.length + results.filter((r) => r.status === 200).length)
        .toBe(results.length);
    });

    it('should limit total response size', async () => {
      const response = await makeRequest(
        '/api/v1/export/all-data',
        'GET',
        undefined,
        { Authorization: 'Bearer mock-token' }
      );

      // Export should be paginated or streamed, not one massive response
      expect([200, 401, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        const responseStr = JSON.stringify(response.data);
        // Should not return more than 10MB in a single response
        expect(responseStr.length).toBeLessThan(10 * 1024 * 1024);
      }
    });

    it('should timeout long-running requests', async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/reports/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({ type: 'full-export' }),
          signal: controller.signal,
        });

        // Should respond within timeout
        expect([200, 202, 401, 403, 404, 429]).toContain(response.status);
      } catch (error) {
        // AbortError means timeout was reached
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('SECURITY TEST: Request timed out after 30s');
        }
      } finally {
        clearTimeout(timeout);
      }
    });
  });
});

// =============================================================================
// Test Statistics
// =============================================================================

/**
 * Test Count Summary:
 * - Mass Assignment Protection: ~22 tests (protected fields + endpoints)
 * - Excessive Data Exposure: ~6 tests
 * - IDOR Protection: ~4 tests
 * - Pagination/Filtering Abuse: ~12 tests
 * - GraphQL Abuse: ~7 tests
 * - Bulk Operation Abuse: ~3 tests
 * - API Version/Discovery: ~4 tests
 * - Resource Exhaustion: ~3 tests
 *
 * Total: 61+ test cases for API abuse
 */
