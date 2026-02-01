/**
 * SQL Injection Security Test Suite
 *
 * Comprehensive tests for SQL injection vulnerabilities across all API endpoints.
 * Covers OWASP A03:2021 - Injection.
 *
 * @module tests/security/sql-injection.security.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// =============================================================================
// Test Configuration
// =============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Common SQL injection payloads for testing
const SQL_INJECTION_PAYLOADS = {
  // Classic SQL injection patterns
  basic: [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    '1; DROP TABLE users--',
    "1'; DROP TABLE users--",
    "' UNION SELECT * FROM users--",
    "admin'--",
    "admin' #",
    "' OR 1=1--",
    "' OR 'x'='x",
    "') OR ('1'='1",
    "') OR ('1'='1'--",
  ],

  // Blind SQL injection patterns
  blind: [
    "' AND 1=1--",
    "' AND 1=2--",
    "' AND SLEEP(5)--",
    "' AND BENCHMARK(1000000,SHA1('test'))--",
    "1' AND (SELECT COUNT(*) FROM users) > 0--",
    "' AND SUBSTRING(username,1,1)='a'--",
    "' AND ASCII(SUBSTRING(password,1,1)) > 64--",
  ],

  // Time-based blind SQL injection
  timeBased: [
    "'; WAITFOR DELAY '0:0:5'--", // SQL Server
    "'; SELECT SLEEP(5)--", // MySQL
    "'; SELECT pg_sleep(5)--", // PostgreSQL
    '1; SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END--',
  ],

  // UNION-based SQL injection
  union: [
    "' UNION SELECT NULL--",
    "' UNION SELECT NULL,NULL--",
    "' UNION SELECT NULL,NULL,NULL--",
    "' UNION SELECT username,password FROM users--",
    "' UNION SELECT 1,2,3,4,5--",
    "' UNION ALL SELECT NULL,NULL,NULL--",
    '-1 UNION SELECT 1,2,3--',
  ],

  // Error-based SQL injection
  errorBased: [
    "' AND EXTRACTVALUE(1,CONCAT(0x7e,version()))--",
    "' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
    "' AND UPDATEXML(1,CONCAT(0x7e,version()),1)--",
    "' AND ROW(1,1)>(SELECT COUNT(*),CONCAT(version(),0x3a,FLOOR(RAND(0)*2))x FROM (SELECT 1 UNION SELECT 2)a GROUP BY x)--",
  ],

  // Stacked queries
  stacked: [
    "'; INSERT INTO users VALUES('hacker','hacked')--",
    "'; UPDATE users SET password='hacked' WHERE username='admin'--",
    "'; DELETE FROM users--",
    "'; CREATE TABLE hacked(id INT)--",
  ],

  // Second-order SQL injection patterns (stored then executed)
  secondOrder: ["admin'--", "test'); DROP TABLE users--('", "'; EXEC xp_cmdshell('whoami')--"],

  // NoSQL injection patterns (for MongoDB, etc.)
  noSQL: [
    '{"$gt": ""}',
    '{"$ne": null}',
    '{"$regex": ".*"}',
    '{"$where": "sleep(5000)"}',
    '{"username": {"$gt": ""}, "password": {"$gt": ""}}',
    '{"$or": [{"a": 1}, {"b": 2}]}',
  ],

  // Numeric injection
  numeric: [
    '1 OR 1=1',
    '1 AND 1=1',
    '1; SELECT * FROM users',
    '-1 OR 1=1',
    '0 OR 1=1',
    '99999999 OR 1=1',
  ],

  // Special encodings
  encoded: [
    '%27%20OR%20%271%27%3D%271', // URL encoded
    '&#x27;&#x20;OR&#x20;&#x27;1&#x27;=&#x27;1', // HTML entity encoded
    "'+OR+'1'='1", // Plus sign encoding
    '0x27204f5220273127273d2731', // Hex encoded
  ],
};

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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
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

    return {
      status: response.status,
      data,
      headers: responseHeaders,
    };
  } catch (error) {
    return {
      status: 0,
      data: null,
      headers: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function isSqlInjectionSuccessful(response: ApiResponse): boolean {
  // Check for signs of successful injection
  const dataStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

  // Database error messages that indicate SQL injection might be working
  const errorIndicators = [
    'sql syntax',
    'mysql',
    'postgresql',
    'sqlite',
    'oracle',
    'microsoft sql',
    'syntax error',
    'unclosed quotation',
    'quoted string not properly terminated',
    'you have an error in your sql syntax',
    'warning: mysql',
    'valid mysql result',
    'pg_query',
    'pg_exec',
    'sqlite_query',
    'ora-',
    'sql server',
    'odbc',
    'db2_',
    'invalid column name',
    'invalid object name',
    'unexpected token',
  ];

  const lowerData = dataStr.toLowerCase();
  return errorIndicators.some((indicator) => lowerData.includes(indicator));
}

function containsInjectedData(response: ApiResponse): boolean {
  // Check if response contains more data than expected (UNION injection success)
  const dataStr = JSON.stringify(response.data);

  // Patterns that suggest data leakage
  const leakageIndicators = [
    'password',
    'secret',
    'token',
    'api_key',
    'private',
    'credit_card',
    'ssn',
    'social_security',
  ];

  const lowerData = dataStr.toLowerCase();
  return leakageIndicators.some((indicator) => lowerData.includes(indicator));
}

// =============================================================================
// SQL Injection Tests - Authentication Endpoints
// =============================================================================

describe('SQL Injection Security Tests', () => {
  describe('Authentication Endpoints', () => {
    describe('Login Endpoint', () => {
      it.each(SQL_INJECTION_PAYLOADS.basic)(
        'should REJECT basic SQL injection in username: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/auth/login', 'POST', {
            email: payload,
            password: 'password123',
          });

          // Should not return successful authentication
          expect(response.status).not.toBe(200);
          // Should not leak database errors
          expect(isSqlInjectionSuccessful(response)).toBe(false);
          // Should not contain sensitive data
          expect(containsInjectedData(response)).toBe(false);
        }
      );

      it.each(SQL_INJECTION_PAYLOADS.basic)(
        'should REJECT basic SQL injection in password: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/auth/login', 'POST', {
            email: 'user@example.com',
            password: payload,
          });

          expect(response.status).not.toBe(200);
          expect(isSqlInjectionSuccessful(response)).toBe(false);
        }
      );

      it.each(SQL_INJECTION_PAYLOADS.blind)(
        'should REJECT blind SQL injection attempts: %s',
        async (payload) => {
          const startTime = Date.now();
          const response = await makeRequest('/api/v1/auth/login', 'POST', {
            email: payload,
            password: 'password123',
          });
          const elapsed = Date.now() - startTime;

          // Time-based injection should not cause delays
          expect(elapsed).toBeLessThan(5000);
          expect(response.status).not.toBe(200);
        }
      );
    });

    describe('Registration Endpoint', () => {
      it.each(SQL_INJECTION_PAYLOADS.stacked)(
        'should REJECT stacked query injection in registration: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/auth/register', 'POST', {
            email: `test${Date.now()}@example.com`,
            password: 'SecurePass123!',
            firstName: payload,
            lastName: 'Test',
          });

          // Should not execute malicious queries
          expect(isSqlInjectionSuccessful(response)).toBe(false);
          expect(containsInjectedData(response)).toBe(false);
        }
      );

      it('should REJECT SQL injection in all registration fields', async () => {
        const payload = "'; DROP TABLE users--";
        const response = await makeRequest('/api/v1/auth/register', 'POST', {
          email: payload,
          password: payload,
          firstName: payload,
          lastName: payload,
          phone: payload,
        });

        expect(isSqlInjectionSuccessful(response)).toBe(false);
      });
    });

    describe('Password Reset Endpoint', () => {
      it.each(SQL_INJECTION_PAYLOADS.union)(
        'should REJECT UNION injection in password reset: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/auth/forgot-password', 'POST', {
            email: payload,
          });

          expect(isSqlInjectionSuccessful(response)).toBe(false);
          expect(containsInjectedData(response)).toBe(false);
        }
      );
    });
  });

  // =============================================================================
  // SQL Injection Tests - Search and Filter Endpoints
  // =============================================================================

  describe('Search and Filter Endpoints', () => {
    describe('User Search', () => {
      it.each(SQL_INJECTION_PAYLOADS.basic)(
        'should REJECT SQL injection in search query: %s',
        async (payload) => {
          const response = await makeRequest(
            `/api/v1/users/search?q=${encodeURIComponent(payload)}`
          );

          expect(isSqlInjectionSuccessful(response)).toBe(false);
          expect(containsInjectedData(response)).toBe(false);
        }
      );

      it.each(SQL_INJECTION_PAYLOADS.union)(
        'should REJECT UNION injection in search: %s',
        async (payload) => {
          const response = await makeRequest(
            `/api/v1/users/search?q=${encodeURIComponent(payload)}`
          );

          expect(isSqlInjectionSuccessful(response)).toBe(false);
        }
      );
    });

    describe('Content Search', () => {
      it.each(SQL_INJECTION_PAYLOADS.basic)(
        'should REJECT SQL injection in lesson search: %s',
        async (payload) => {
          const response = await makeRequest(
            `/api/v1/lessons/search?title=${encodeURIComponent(payload)}`
          );

          expect(isSqlInjectionSuccessful(response)).toBe(false);
        }
      );

      it.each(SQL_INJECTION_PAYLOADS.timeBased)(
        'should REJECT time-based injection in course search: %s',
        async (payload) => {
          const startTime = Date.now();
          const response = await makeRequest(
            `/api/v1/courses/search?name=${encodeURIComponent(payload)}`
          );
          const elapsed = Date.now() - startTime;

          // Should not cause time delays
          expect(elapsed).toBeLessThan(5000);
        }
      );
    });

    describe('Filter Parameters', () => {
      it('should REJECT SQL injection in sort parameter', async () => {
        const payload = 'name; DROP TABLE users--';
        const response = await makeRequest(`/api/v1/users?sort=${encodeURIComponent(payload)}`);

        expect(isSqlInjectionSuccessful(response)).toBe(false);
      });

      it('should REJECT SQL injection in order parameter', async () => {
        const payload = 'ASC; DELETE FROM users--';
        const response = await makeRequest(`/api/v1/users?order=${encodeURIComponent(payload)}`);

        expect(isSqlInjectionSuccessful(response)).toBe(false);
      });

      it('should REJECT SQL injection in filter parameters', async () => {
        const payload = "' OR 1=1--";
        const response = await makeRequest(
          `/api/v1/lessons?status=${encodeURIComponent(payload)}&grade=${encodeURIComponent(payload)}`
        );

        expect(isSqlInjectionSuccessful(response)).toBe(false);
      });

      it('should REJECT SQL injection in pagination parameters', async () => {
        const response = await makeRequest(
          `/api/v1/users?page=1;DROP TABLE users--&limit=10 OR 1=1`
        );

        expect(isSqlInjectionSuccessful(response)).toBe(false);
      });
    });
  });

  // =============================================================================
  // SQL Injection Tests - CRUD Endpoints
  // =============================================================================

  describe('CRUD Endpoints', () => {
    describe('GET by ID', () => {
      it.each(SQL_INJECTION_PAYLOADS.basic)(
        'should REJECT SQL injection in ID parameter: %s',
        async (payload) => {
          const response = await makeRequest(`/api/v1/users/${encodeURIComponent(payload)}`);

          expect(isSqlInjectionSuccessful(response)).toBe(false);
          expect(containsInjectedData(response)).toBe(false);
        }
      );

      it('should REJECT numeric injection in ID', async () => {
        const payload = '1 OR 1=1';
        const response = await makeRequest(`/api/v1/users/${encodeURIComponent(payload)}`);

        expect(isSqlInjectionSuccessful(response)).toBe(false);
      });
    });

    describe('POST Create', () => {
      it.each(SQL_INJECTION_PAYLOADS.stacked)(
        'should REJECT stacked queries in create: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/lessons', 'POST', {
            title: payload,
            description: 'Test lesson',
            content: 'Test content',
          });

          expect(isSqlInjectionSuccessful(response)).toBe(false);
        }
      );

      it('should properly escape special characters in content', async () => {
        const payload = "O'Brien's lesson about 'quotes'";
        const response = await makeRequest('/api/v1/lessons', 'POST', {
          title: payload,
          description: payload,
          content: payload,
        });

        // Should accept valid content with quotes
        // But not trigger SQL errors
        expect(isSqlInjectionSuccessful(response)).toBe(false);
      });
    });

    describe('PUT/PATCH Update', () => {
      it.each(SQL_INJECTION_PAYLOADS.union)(
        'should REJECT UNION injection in update: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/users/123', 'PATCH', {
            firstName: payload,
            lastName: payload,
          });

          expect(isSqlInjectionSuccessful(response)).toBe(false);
        }
      );
    });

    describe('DELETE', () => {
      it.each(SQL_INJECTION_PAYLOADS.basic)(
        'should REJECT SQL injection in delete ID: %s',
        async (payload) => {
          const response = await makeRequest(
            `/api/v1/lessons/${encodeURIComponent(payload)}`,
            'DELETE'
          );

          expect(isSqlInjectionSuccessful(response)).toBe(false);
        }
      );
    });
  });

  // =============================================================================
  // SQL Injection Tests - NoSQL Injection (MongoDB)
  // =============================================================================

  describe('NoSQL Injection', () => {
    it.each(SQL_INJECTION_PAYLOADS.noSQL)(
      'should REJECT NoSQL injection patterns: %s',
      async (payload) => {
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: payload,
          password: payload,
        });

        expect(response.status).not.toBe(200);
        expect(containsInjectedData(response)).toBe(false);
      }
    );

    it('should REJECT $where operator injection', async () => {
      const response = await makeRequest('/api/v1/users/search', 'POST', {
        query: { $where: 'this.password.length > 0' },
      });

      expect(containsInjectedData(response)).toBe(false);
    });

    it('should REJECT operator injection in query parameters', async () => {
      const response = await makeRequest('/api/v1/users?role[$ne]=admin');

      // Should not return elevated privileges
      expect(containsInjectedData(response)).toBe(false);
    });
  });

  // =============================================================================
  // SQL Injection Tests - Encoded Payloads
  // =============================================================================

  describe('Encoded SQL Injection', () => {
    it.each(SQL_INJECTION_PAYLOADS.encoded)(
      'should REJECT encoded SQL injection: %s',
      async (payload) => {
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: payload,
          password: 'password123',
        });

        expect(response.status).not.toBe(200);
        expect(isSqlInjectionSuccessful(response)).toBe(false);
      }
    );

    it('should REJECT double-encoded SQL injection', async () => {
      // Double URL encoding: ' OR '1'='1 -> %2527%2520OR%2520%25271%2527%253D%25271
      const doubleEncoded = '%2527%2520OR%2520%25271%2527%253D%25271';
      const response = await makeRequest(`/api/v1/users/search?q=${doubleEncoded}`);

      expect(isSqlInjectionSuccessful(response)).toBe(false);
    });

    it('should REJECT Unicode-encoded SQL injection', async () => {
      // Unicode encoding of ' OR '1'='1
      const unicodePayload = '\u0027\u0020OR\u0020\u00271\u0027=\u00271';
      const response = await makeRequest('/api/v1/auth/login', 'POST', {
        email: unicodePayload,
        password: 'password123',
      });

      expect(response.status).not.toBe(200);
    });
  });

  // =============================================================================
  // SQL Injection Tests - Error-Based Extraction
  // =============================================================================

  describe('Error-Based SQL Injection', () => {
    it.each(SQL_INJECTION_PAYLOADS.errorBased)(
      'should NOT leak database errors: %s',
      async (payload) => {
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: payload,
          password: 'password123',
        });

        // Should not expose database version or structure
        const responseStr = JSON.stringify(response.data).toLowerCase();
        expect(responseStr).not.toMatch(/mysql|postgresql|sqlite|oracle|version/);
        expect(isSqlInjectionSuccessful(response)).toBe(false);
      }
    );

    it('should return generic error messages', async () => {
      const response = await makeRequest('/api/v1/auth/login', 'POST', {
        email: "' AND EXTRACTVALUE(1,CONCAT(0x7e,version()))--",
        password: 'password123',
      });

      // Error should be generic, not database-specific
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        const error = (response.data as { error: string }).error.toLowerCase();
        expect(error).not.toMatch(/sql|syntax|query|database/);
      }
    });
  });

  // =============================================================================
  // SQL Injection Tests - Second-Order Injection
  // =============================================================================

  describe('Second-Order SQL Injection', () => {
    it('should sanitize stored data that may be used in queries', async () => {
      // Store potentially malicious data
      const maliciousName = "admin'--";
      const registerResponse = await makeRequest('/api/v1/auth/register', 'POST', {
        email: `test${Date.now()}@example.com`,
        password: 'SecurePass123!',
        firstName: maliciousName,
        lastName: 'Test',
      });

      // Later query should not be affected by stored injection
      const searchResponse = await makeRequest(
        `/api/v1/users/search?name=${encodeURIComponent(maliciousName)}`
      );

      expect(isSqlInjectionSuccessful(searchResponse)).toBe(false);
    });

    it('should safely handle exported/imported data', async () => {
      // Data that might be exported and re-imported
      const payload = "Robert'); DROP TABLE Students;--";
      const response = await makeRequest('/api/v1/import/users', 'POST', {
        users: [
          {
            name: payload,
            email: 'test@example.com',
          },
        ],
      });

      expect(isSqlInjectionSuccessful(response)).toBe(false);
    });
  });

  // =============================================================================
  // SQL Injection Tests - Parameterized Query Validation
  // =============================================================================

  describe('Parameterized Query Validation', () => {
    it('should use parameterized queries for user lookup', async () => {
      // This test verifies parameterized queries by checking that
      // SQL metacharacters are treated as literal values
      const response = await makeRequest('/api/v1/users/search', 'POST', {
        email: "test'test@example.com", // Email with quote
      });

      // Should either find no results or return validation error
      // But NOT trigger SQL error
      expect(isSqlInjectionSuccessful(response)).toBe(false);
    });

    it('should handle batch operations safely', async () => {
      const maliciousIds = ['1', '2; DROP TABLE users--', '3 OR 1=1'];

      const response = await makeRequest('/api/v1/users/batch', 'POST', {
        ids: maliciousIds,
      });

      expect(isSqlInjectionSuccessful(response)).toBe(false);
    });

    it('should handle array parameters safely', async () => {
      const response = await makeRequest('/api/v1/lessons', 'GET', undefined, {
        'X-Filter-Tags': "math'; DROP TABLE lessons--",
      });

      expect(isSqlInjectionSuccessful(response)).toBe(false);
    });

    it('should handle JSON field queries safely', async () => {
      const response = await makeRequest('/api/v1/users/search', 'POST', {
        metadata: {
          role: "admin'--",
          permissions: ["read', 'write'); DELETE FROM permissions--"],
        },
      });

      expect(isSqlInjectionSuccessful(response)).toBe(false);
    });
  });

  // =============================================================================
  // SQL Injection Tests - ORM-Specific
  // =============================================================================

  describe('ORM-Specific Injection Prevention', () => {
    it('should prevent raw query injection through ORM', async () => {
      // Attempt to inject through commonly misused ORM features
      const response = await makeRequest('/api/v1/reports/custom', 'POST', {
        fields: ['name', "email'; DROP TABLE users--"],
        conditions: {
          status: "active' OR '1'='1",
        },
      });

      expect(isSqlInjectionSuccessful(response)).toBe(false);
    });

    it('should prevent injection in dynamic table names', async () => {
      const response = await makeRequest('/api/v1/analytics/query', 'POST', {
        table: 'users; DROP TABLE users--',
        metric: 'count',
      });

      expect(isSqlInjectionSuccessful(response)).toBe(false);
    });

    it('should prevent injection in dynamic column selection', async () => {
      const response = await makeRequest('/api/v1/export', 'POST', {
        columns: ['id', 'name', 'password FROM users--'],
        format: 'csv',
      });

      expect(containsInjectedData(response)).toBe(false);
    });
  });
});

// =============================================================================
// Test Statistics
// =============================================================================

/**
 * Test Count Summary:
 * - Authentication Endpoints: ~25 tests
 * - Search/Filter Endpoints: ~15 tests
 * - CRUD Endpoints: ~15 tests
 * - NoSQL Injection: ~5 tests
 * - Encoded Payloads: ~5 tests
 * - Error-Based Injection: ~5 tests
 * - Second-Order Injection: ~2 tests
 * - Parameterized Query Validation: ~4 tests
 * - ORM-Specific: ~3 tests
 *
 * Total: 70+ test cases for SQL injection
 */
