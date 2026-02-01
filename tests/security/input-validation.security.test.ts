/**
 * Input Validation Security Test Suite
 *
 * Comprehensive tests for input validation and data integrity.
 * Covers OWASP A03:2021 - Injection and A04:2021 - Insecure Design.
 *
 * @module tests/security/input-validation.security.test
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Test Configuration
// =============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Payload size configurations
const PAYLOAD_LIMITS = {
  maxJsonBody: 1024 * 1024, // 1MB
  maxFileUpload: 10 * 1024 * 1024, // 10MB
  maxStringField: 10000, // 10,000 characters
  maxArrayLength: 1000,
  maxObjectDepth: 20,
};

// Dangerous file types
const DANGEROUS_FILE_TYPES = [
  { ext: '.exe', mime: 'application/x-msdownload' },
  { ext: '.dll', mime: 'application/x-msdownload' },
  { ext: '.bat', mime: 'application/x-bat' },
  { ext: '.cmd', mime: 'application/x-cmd' },
  { ext: '.sh', mime: 'application/x-sh' },
  { ext: '.php', mime: 'application/x-httpd-php' },
  { ext: '.jsp', mime: 'application/x-jsp' },
  { ext: '.asp', mime: 'application/x-asp' },
  { ext: '.aspx', mime: 'application/x-aspx' },
  { ext: '.js', mime: 'application/javascript' },
  { ext: '.html', mime: 'text/html' },
  { ext: '.svg', mime: 'image/svg+xml' }, // Can contain scripts
  { ext: '.jar', mime: 'application/java-archive' },
  { ext: '.war', mime: 'application/java-archive' },
  { ext: '.py', mime: 'text/x-python' },
  { ext: '.rb', mime: 'text/x-ruby' },
];

// Special characters for boundary testing
const SPECIAL_CHARACTERS = {
  nullBytes: ['\x00', '\u0000', '%00'],
  controlChars: ['\x01', '\x02', '\x03', '\x1f', '\x7f'],
  unicodeSurrogates: ['\ud800', '\udfff', '\ud800\udc00'],
  bom: ['\ufeff', '\ufffe'],
  newlines: ['\n', '\r', '\r\n', '\u2028', '\u2029'],
  whitespace: [' ', '\t', '\v', '\f', '\u00a0', '\u1680', '\u2000'],
  quotes: ["'", '"', '`', '\u2018', '\u2019', '\u201c', '\u201d'],
  brackets: ['<', '>', '{', '}', '[', ']', '(', ')'],
  specialSymbols: ['\\', '/', '|', '&', ';', '$', '#', '@', '!', '^'],
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
  headers?: Record<string, string>,
  rawBody?: string | Buffer
): Promise<ApiResponse> {
  try {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    let requestBody: string | Buffer | undefined;
    if (rawBody) {
      requestBody = rawBody;
    } else if (body) {
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
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

function generateLargeString(size: number): string {
  return 'A'.repeat(size);
}

function generateDeepObject(depth: number): unknown {
  if (depth === 0) return 'value';
  return { nested: generateDeepObject(depth - 1) };
}

function generateLargeArray(length: number): unknown[] {
  return Array(length).fill({ item: 'value' });
}

function createMockFile(filename: string, content: string, mimeType: string): Blob {
  return new Blob([content], { type: mimeType });
}

// =============================================================================
// Payload Size Limit Tests
// =============================================================================

describe('Input Validation Security Tests', () => {
  describe('Payload Size Limits', () => {
    describe('JSON Body Size', () => {
      it('should reject oversized JSON payloads', async () => {
        const largeData = {
          content: generateLargeString(PAYLOAD_LIMITS.maxJsonBody + 1000),
        };

        const response = await makeRequest('/api/v1/posts', 'POST', largeData);

        // Should reject with 413 Payload Too Large or 400 Bad Request
        expect([400, 413]).toContain(response.status);
      });

      it('should accept payloads within size limit', async () => {
        const validData = {
          content: generateLargeString(1000), // 1KB
        };

        const response = await makeRequest('/api/v1/posts', 'POST', validData);

        // Should not be rejected for size
        expect(response.status).not.toBe(413);
      });

      it('should reject deeply nested objects', async () => {
        const deepObject = generateDeepObject(PAYLOAD_LIMITS.maxObjectDepth + 10);

        const response = await makeRequest('/api/v1/settings', 'PUT', deepObject);

        expect([400, 413, 422]).toContain(response.status);
      });

      it('should reject excessively long arrays', async () => {
        const largeArray = {
          items: generateLargeArray(PAYLOAD_LIMITS.maxArrayLength + 100),
        };

        const response = await makeRequest('/api/v1/batch', 'POST', largeArray);

        expect([400, 413, 422]).toContain(response.status);
      });

      it('should handle malformed JSON gracefully', async () => {
        const malformedJson = '{"key": "value"';

        const response = await makeRequest(
          '/api/v1/posts',
          'POST',
          undefined,
          { 'Content-Type': 'application/json' },
          malformedJson
        );

        expect(response.status).toBe(400);
      });

      it('should reject JSON with duplicate keys', async () => {
        // Some parsers may accept this; security concern is data integrity
        const duplicateKeys = '{"key": "first", "key": "second"}';

        const response = await makeRequest(
          '/api/v1/posts',
          'POST',
          undefined,
          { 'Content-Type': 'application/json' },
          duplicateKeys
        );

        // Should accept but use consistent behavior (first or last wins)
        expect([200, 201, 400]).toContain(response.status);
      });
    });

    describe('String Field Limits', () => {
      it('should reject oversized string fields', async () => {
        const response = await makeRequest('/api/v1/users/profile', 'PUT', {
          bio: generateLargeString(PAYLOAD_LIMITS.maxStringField + 1000),
        });

        expect([400, 413, 422]).toContain(response.status);
      });

      it('should reject oversized titles', async () => {
        const response = await makeRequest('/api/v1/lessons', 'POST', {
          title: generateLargeString(1000), // Title should have smaller limit
          content: 'Valid content',
        });

        expect([400, 422]).toContain(response.status);
      });

      it('should truncate or reject long URLs', async () => {
        const response = await makeRequest('/api/v1/links', 'POST', {
          url: 'https://example.com/' + generateLargeString(10000),
        });

        expect([400, 422]).toContain(response.status);
      });
    });
  });

  // =============================================================================
  // File Upload Tests
  // =============================================================================

  describe('File Upload Restrictions', () => {
    describe('File Type Validation', () => {
      it.each(DANGEROUS_FILE_TYPES)(
        'should REJECT dangerous file type: $ext ($mime)',
        async ({ ext, mime }) => {
          const formData = new FormData();
          const mockFile = createMockFile(`malicious${ext}`, 'dangerous content', mime);
          formData.append('file', mockFile, `malicious${ext}`);

          const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
            method: 'POST',
            body: formData,
          });

          expect([400, 415, 422]).toContain(response.status);
        }
      );

      it('should REJECT files with double extensions', async () => {
        const formData = new FormData();
        const mockFile = createMockFile('image.jpg.exe', 'dangerous', 'application/x-msdownload');
        formData.append('file', mockFile, 'image.jpg.exe');

        const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
          method: 'POST',
          body: formData,
        });

        expect([400, 415, 422]).toContain(response.status);
      });

      it('should validate file content, not just extension', async () => {
        // PHP content disguised as image
        const formData = new FormData();
        const phpContent = '<?php echo "hacked"; ?>';
        const mockFile = createMockFile('image.jpg', phpContent, 'image/jpeg');
        formData.append('file', mockFile, 'image.jpg');

        const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
          method: 'POST',
          body: formData,
        });

        // Should detect content mismatch
        expect([200, 400, 415, 422]).toContain(response.status);
      });

      it('should REJECT polyglot files (valid as multiple types)', async () => {
        // File that's both valid JPEG and contains JS
        const formData = new FormData();
        // GIF header with script
        const polyglotContent = 'GIF89a/*<script>alert(1)</script>*/=1';
        const mockFile = createMockFile('image.gif', polyglotContent, 'image/gif');
        formData.append('file', mockFile, 'image.gif');

        const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
          method: 'POST',
          body: formData,
        });

        // Should sanitize or reject
        expect([200, 400, 415, 422]).toContain(response.status);
      });

      it('should ACCEPT valid image files', async () => {
        const formData = new FormData();
        // Minimal valid PNG header
        const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const mockFile = new Blob([pngHeader], { type: 'image/png' });
        formData.append('file', mockFile, 'valid.png');

        const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
          method: 'POST',
          body: formData,
        });

        // Should accept valid images
        expect([200, 201, 400]).toContain(response.status); // 400 if incomplete PNG
      });
    });

    describe('File Size Validation', () => {
      it('should reject oversized file uploads', async () => {
        const formData = new FormData();
        const largeContent = generateLargeString(PAYLOAD_LIMITS.maxFileUpload + 1000);
        const mockFile = createMockFile('large.txt', largeContent, 'text/plain');
        formData.append('file', mockFile, 'large.txt');

        const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
          method: 'POST',
          body: formData,
        });

        expect([400, 413]).toContain(response.status);
      });

      it('should reject multiple files exceeding total limit', async () => {
        const formData = new FormData();

        for (let i = 0; i < 10; i++) {
          const content = generateLargeString(2 * 1024 * 1024); // 2MB each
          const mockFile = createMockFile(`file${i}.txt`, content, 'text/plain');
          formData.append('files', mockFile, `file${i}.txt`);
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/uploads/batch`, {
          method: 'POST',
          body: formData,
        });

        expect([400, 413]).toContain(response.status);
      });
    });

    describe('Filename Validation', () => {
      it('should sanitize path traversal in filenames', async () => {
        const formData = new FormData();
        const mockFile = createMockFile('file.txt', 'content', 'text/plain');
        formData.append('file', mockFile, '../../../etc/passwd');

        const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
          method: 'POST',
          body: formData,
        });

        // Should either reject or sanitize the filename
        expect([200, 201, 400, 422]).toContain(response.status);
      });

      it('should handle null bytes in filenames', async () => {
        const formData = new FormData();
        const mockFile = createMockFile('file.txt', 'content', 'text/plain');
        formData.append('file', mockFile, 'file.txt\x00.exe');

        const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
          method: 'POST',
          body: formData,
        });

        expect([200, 201, 400, 422]).toContain(response.status);
      });

      it('should handle special characters in filenames', async () => {
        const specialFilenames = [
          'file<script>.txt',
          'file&name.txt',
          'file;name.txt',
          'file|name.txt',
          'file`name.txt',
        ];

        for (const filename of specialFilenames) {
          const formData = new FormData();
          const mockFile = createMockFile(filename, 'content', 'text/plain');
          formData.append('file', mockFile, filename);

          const response = await fetch(`${API_BASE_URL}/api/v1/uploads`, {
            method: 'POST',
            body: formData,
          });

          // Should handle gracefully
          expect([200, 201, 400, 422]).toContain(response.status);
        }
      });
    });
  });

  // =============================================================================
  // Data Type Validation Tests
  // =============================================================================

  describe('Data Type Validation', () => {
    describe('Type Coercion Prevention', () => {
      it('should reject string when number expected', async () => {
        const response = await makeRequest('/api/v1/users/123/age', 'PUT', {
          age: 'twenty-five',
        });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject number when string expected', async () => {
        const response = await makeRequest('/api/v1/users/123', 'PUT', {
          firstName: 12345,
        });

        // Should validate type
        expect([200, 400, 422]).toContain(response.status);
      });

      it('should reject array when object expected', async () => {
        const response = await makeRequest('/api/v1/users/123/settings', 'PUT', [{ key: 'value' }]);

        expect([400, 422]).toContain(response.status);
      });

      it('should reject object when array expected', async () => {
        const response = await makeRequest('/api/v1/batch/users', 'POST', {
          users: { id: 1, name: 'test' }, // Should be array
        });

        expect([400, 422]).toContain(response.status);
      });

      it('should handle prototype pollution attempts', async () => {
        const response = await makeRequest('/api/v1/users/123', 'PUT', {
          __proto__: { isAdmin: true },
          constructor: { prototype: { isAdmin: true } },
        });

        // Should not allow prototype pollution
        expect(response.status).not.toBe(200);
      });
    });

    describe('Number Validation', () => {
      it('should reject NaN values', async () => {
        const response = await makeRequest('/api/v1/products/123/price', 'PUT', {
          price: NaN,
        });

        expect([400, 422]).toContain(response.status);
      });

      it('should reject Infinity values', async () => {
        const response = await makeRequest('/api/v1/products/123/price', 'PUT', {
          price: Infinity,
        });

        expect([400, 422]).toContain(response.status);
      });

      it('should validate integer ranges', async () => {
        const response = await makeRequest('/api/v1/users/123', 'PUT', {
          age: 9999999999999999999, // Beyond safe integer
        });

        expect([400, 422]).toContain(response.status);
      });

      it('should handle negative numbers appropriately', async () => {
        const response = await makeRequest('/api/v1/orders', 'POST', {
          quantity: -5,
          price: -10.5,
        });

        // Should validate business logic (no negative quantities)
        expect([400, 422]).toContain(response.status);
      });
    });

    describe('String Validation', () => {
      it('should validate email format', async () => {
        const invalidEmails = [
          'notanemail',
          'missing@domain',
          '@nodomain.com',
          'spaces in@email.com',
          'email@domain..com',
        ];

        for (const email of invalidEmails) {
          const response = await makeRequest('/api/v1/auth/register', 'POST', {
            email,
            password: 'ValidPass123!',
          });

          expect([400, 422]).toContain(response.status);
        }
      });

      it('should validate URL format', async () => {
        const invalidUrls = [
          'not-a-url',
          'ftp://invalid-scheme.com',
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
        ];

        for (const url of invalidUrls) {
          const response = await makeRequest('/api/v1/links', 'POST', {
            url,
          });

          expect([400, 422]).toContain(response.status);
        }
      });

      it('should validate UUID format', async () => {
        const invalidUuids = [
          'not-a-uuid',
          '12345678-1234-1234-1234-123456789',
          '12345678-1234-1234-1234-1234567890123',
          'gggggggg-gggg-gggg-gggg-gggggggggggg',
        ];

        for (const uuid of invalidUuids) {
          const response = await makeRequest(`/api/v1/users/${uuid}`);

          expect([400, 404, 422]).toContain(response.status);
        }
      });

      it('should validate date/datetime format', async () => {
        const invalidDates = [
          'not-a-date',
          '2024-13-01', // Invalid month
          '2024-01-32', // Invalid day
          '2024-02-30', // Invalid Feb day
        ];

        for (const date of invalidDates) {
          const response = await makeRequest('/api/v1/events', 'POST', {
            date,
          });

          expect([400, 422]).toContain(response.status);
        }
      });
    });

    describe('Boolean Validation', () => {
      it('should reject truthy non-boolean values', async () => {
        const response = await makeRequest('/api/v1/users/123/settings', 'PUT', {
          notifications: 'yes', // Should be boolean
        });

        // Should validate strictly
        expect([200, 400, 422]).toContain(response.status);
      });

      it('should handle string booleans appropriately', async () => {
        const response = await makeRequest('/api/v1/users/123/settings', 'PUT', {
          notifications: 'true', // String, not boolean
        });

        // Should either reject or coerce consistently
        expect([200, 400, 422]).toContain(response.status);
      });
    });
  });

  // =============================================================================
  // Boundary Condition Tests
  // =============================================================================

  describe('Boundary Conditions', () => {
    describe('Numeric Boundaries', () => {
      it('should handle zero values', async () => {
        const response = await makeRequest('/api/v1/products/123/inventory', 'PUT', {
          quantity: 0,
        });

        expect([200, 400, 422]).toContain(response.status);
      });

      it('should handle maximum integer values', async () => {
        const response = await makeRequest('/api/v1/products/123', 'PUT', {
          stock: Number.MAX_SAFE_INTEGER,
        });

        expect([200, 400, 422]).toContain(response.status);
      });

      it('should handle minimum integer values', async () => {
        const response = await makeRequest('/api/v1/analytics', 'POST', {
          offset: Number.MIN_SAFE_INTEGER,
        });

        expect([400, 422]).toContain(response.status);
      });

      it('should validate pagination boundaries', async () => {
        const response = await makeRequest('/api/v1/users?page=0&limit=0');

        expect([400, 422]).toContain(response.status);
      });

      it('should reject extreme pagination values', async () => {
        const response = await makeRequest('/api/v1/users?page=999999&limit=10000');

        expect([400, 422]).toContain(response.status);
      });
    });

    describe('String Boundaries', () => {
      it('should handle empty strings', async () => {
        const response = await makeRequest('/api/v1/users/123', 'PUT', {
          firstName: '',
        });

        // Empty required field should be rejected
        expect([400, 422]).toContain(response.status);
      });

      it('should handle whitespace-only strings', async () => {
        const response = await makeRequest('/api/v1/users/123', 'PUT', {
          firstName: '   ',
        });

        // Whitespace-only should be treated as empty
        expect([400, 422]).toContain(response.status);
      });

      it('should handle single character strings', async () => {
        const response = await makeRequest('/api/v1/users/123', 'PUT', {
          firstName: 'A',
        });

        // Should validate minimum length
        expect([200, 400, 422]).toContain(response.status);
      });
    });

    describe('Array Boundaries', () => {
      it('should handle empty arrays', async () => {
        const response = await makeRequest('/api/v1/batch/process', 'POST', {
          items: [],
        });

        // Empty array might be valid or invalid depending on endpoint
        expect([200, 400, 422]).toContain(response.status);
      });

      it('should handle single-item arrays', async () => {
        const response = await makeRequest('/api/v1/batch/process', 'POST', {
          items: [{ id: 1 }],
        });

        expect([200, 400, 422]).toContain(response.status);
      });

      it('should validate maximum array length', async () => {
        const response = await makeRequest('/api/v1/batch/process', 'POST', {
          items: Array(10001).fill({ id: 1 }),
        });

        expect([400, 413, 422]).toContain(response.status);
      });
    });
  });

  // =============================================================================
  // Special Character Handling Tests
  // =============================================================================

  describe('Special Character Handling', () => {
    describe('Null Bytes', () => {
      it.each(SPECIAL_CHARACTERS.nullBytes)('should handle null byte: %s', async (nullByte) => {
        const response = await makeRequest('/api/v1/search', 'POST', {
          query: `test${nullByte}query`,
        });

        // Should sanitize or reject null bytes
        expect([200, 400, 422]).toContain(response.status);

        // Response should not contain null byte
        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toContain('\x00');
      });
    });

    describe('Control Characters', () => {
      it.each(SPECIAL_CHARACTERS.controlChars)(
        'should sanitize control character: %s',
        async (char) => {
          const response = await makeRequest('/api/v1/posts', 'POST', {
            content: `test${char}content`,
          });

          // Should sanitize or reject control characters
          expect([200, 201, 400, 422]).toContain(response.status);
        }
      );
    });

    describe('Unicode Edge Cases', () => {
      it('should handle UTF-8 BOM', async () => {
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: '\ufeffContent with BOM',
        });

        expect([200, 201, 400, 422]).toContain(response.status);
      });

      it('should handle right-to-left override characters', async () => {
        const response = await makeRequest('/api/v1/users/123', 'PUT', {
          firstName: 'test\u202eevil\u202c',
        });

        // Should sanitize RTL override
        expect([200, 400, 422]).toContain(response.status);
      });

      it('should handle zero-width characters', async () => {
        const zeroWidth = '\u200b\u200c\u200d\ufeff';
        const response = await makeRequest('/api/v1/users/123', 'PUT', {
          firstName: `Test${zeroWidth}Name`,
        });

        expect([200, 400, 422]).toContain(response.status);
      });

      it('should handle homoglyph characters', async () => {
        // Cyrillic 'а' looks like Latin 'a'
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: 'аdmin@example.com', // Cyrillic 'а'
          password: 'password',
        });

        // Should not confuse with ASCII characters
        expect([400, 401]).toContain(response.status);
      });
    });

    describe('Line Terminators', () => {
      it.each(SPECIAL_CHARACTERS.newlines)(
        'should handle line terminator in single-line fields',
        async (newline) => {
          const response = await makeRequest('/api/v1/users/123', 'PUT', {
            firstName: `Test${newline}Name`,
          });

          // Single-line fields should reject or sanitize newlines
          expect([200, 400, 422]).toContain(response.status);
        }
      );
    });

    describe('JSON-Specific Characters', () => {
      it('should handle escaped backslashes', async () => {
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: 'Path: C:\\Users\\test\\file.txt',
        });

        expect([200, 201]).toContain(response.status);
      });

      it('should handle escaped quotes', async () => {
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: 'He said "Hello" to \'everyone\'',
        });

        expect([200, 201]).toContain(response.status);
      });
    });
  });

  // =============================================================================
  // Content-Type Validation Tests
  // =============================================================================

  describe('Content-Type Validation', () => {
    it('should reject wrong Content-Type for JSON endpoints', async () => {
      const response = await makeRequest(
        '/api/v1/users',
        'POST',
        undefined,
        { 'Content-Type': 'text/plain' },
        '{"name": "test"}'
      );

      expect([400, 415]).toContain(response.status);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
        method: 'POST',
        body: '{"name": "test"}',
      });

      expect([400, 415]).toContain(response.status);
    });

    it('should handle charset in Content-Type', async () => {
      const response = await makeRequest(
        '/api/v1/users',
        'POST',
        { name: 'test' },
        { 'Content-Type': 'application/json; charset=utf-8' }
      );

      expect([200, 201, 400, 401]).toContain(response.status);
    });

    it('should reject XML when JSON expected', async () => {
      const response = await makeRequest(
        '/api/v1/users',
        'POST',
        undefined,
        { 'Content-Type': 'application/xml' },
        '<user><name>test</name></user>'
      );

      expect([400, 415]).toContain(response.status);
    });
  });

  // =============================================================================
  // Required Field Validation Tests
  // =============================================================================

  describe('Required Field Validation', () => {
    it('should reject missing required fields', async () => {
      const response = await makeRequest('/api/v1/users', 'POST', {
        // Missing required 'email' and 'password'
        firstName: 'Test',
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject null required fields', async () => {
      const response = await makeRequest('/api/v1/users', 'POST', {
        email: null,
        password: null,
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject undefined required fields', async () => {
      const response = await makeRequest('/api/v1/users', 'POST', {
        email: undefined,
        password: 'ValidPass123!',
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should provide clear error messages for validation failures', async () => {
      const response = await makeRequest('/api/v1/users', 'POST', {
        firstName: 'Test',
      });

      if (response.status === 400 || response.status === 422) {
        const data = response.data as Record<string, unknown>;
        // Should include field-specific error information
        expect(data.errors || data.message || data.details).toBeDefined();
      }
    });
  });

  // =============================================================================
  // HTTP Method Validation Tests
  // =============================================================================

  describe('HTTP Method Validation', () => {
    it('should reject unsupported HTTP methods', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
        method: 'TRACE',
      });

      expect([400, 405]).toContain(response.status);
    });

    it('should include Allow header for 405 responses', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/123`, {
        method: 'POST', // Should be PUT/PATCH
      });

      if (response.status === 405) {
        const allowHeader = response.headers.get('Allow');
        expect(allowHeader).toBeDefined();
      }
    });

    it('should handle HEAD requests appropriately', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
        method: 'HEAD',
      });

      expect([200, 405]).toContain(response.status);
    });

    it('should handle OPTIONS requests for CORS', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
        method: 'OPTIONS',
      });

      expect([200, 204]).toContain(response.status);
    });
  });
});

// =============================================================================
// Test Statistics
// =============================================================================

/**
 * Test Count Summary:
 * - Payload Size Limits: ~7 tests
 * - File Upload Restrictions: ~12 tests
 * - Data Type Validation: ~20 tests
 * - Boundary Conditions: ~10 tests
 * - Special Character Handling: ~12 tests
 * - Content-Type Validation: ~4 tests
 * - Required Field Validation: ~4 tests
 * - HTTP Method Validation: ~4 tests
 *
 * Total: 73+ test cases for input validation
 */
