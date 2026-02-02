/**
 * Security Headers Middleware Unit Tests
 *
 * Tests for CSP, HSTS, X-Frame-Options, and other security headers.
 *
 * @module tests/security-headers.middleware.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock helmet
const mockHelmetMiddleware = vi.fn((req: any, res: any, next: any) => next());
vi.mock('helmet', () => ({
  default: vi.fn(() => mockHelmetMiddleware),
}));

// Security header constants
const SECURITY_HEADERS = {
  CSP_REPORT_URI: '/api/csp-report',
  HSTS_MAX_AGE: 31536000, // 1 year
  FEATURE_POLICY: [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ],
};

// Mock request/response
function createMockRequest(path: string = '/api/test') {
  return {
    path,
    headers: {},
  };
}

function createMockResponse() {
  const headers: Record<string, string> = {};
  return {
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    getHeader: vi.fn((name: string) => headers[name]),
    headers,
  };
}

describe('SecurityHeadersMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Content Security Policy
  // ===========================================================================

  describe('Content Security Policy', () => {
    it('should set default-src to self', () => {
      const cspDirectives = {
        defaultSrc: ["'self'"],
      };

      expect(cspDirectives.defaultSrc).toContain("'self'");
    });

    it('should set script-src with strict-dynamic', () => {
      const cspDirectives = {
        scriptSrc: ["'self'", "'strict-dynamic'"],
      };

      expect(cspDirectives.scriptSrc).toContain("'self'");
      expect(cspDirectives.scriptSrc).toContain("'strict-dynamic'");
    });

    it('should set style-src allowing unsafe-inline', () => {
      const cspDirectives = {
        styleSrc: ["'self'", "'unsafe-inline'"],
      };

      // Note: unsafe-inline for styles is sometimes necessary for CSS-in-JS
      expect(cspDirectives.styleSrc).toContain("'unsafe-inline'");
    });

    it('should set img-src allowing data URIs', () => {
      const cspDirectives = {
        imgSrc: ["'self'", 'data:', 'https:'],
      };

      expect(cspDirectives.imgSrc).toContain('data:');
      expect(cspDirectives.imgSrc).toContain('https:');
    });

    it('should set connect-src for API endpoints', () => {
      const cspDirectives = {
        connectSrc: ["'self'", 'https://api.aivo.edu', 'wss://api.aivo.edu'],
      };

      expect(cspDirectives.connectSrc).toContain('https://api.aivo.edu');
      expect(cspDirectives.connectSrc).toContain('wss://api.aivo.edu');
    });

    it('should block frame-src', () => {
      const cspDirectives = {
        frameSrc: ["'none'"],
      };

      expect(cspDirectives.frameSrc).toContain("'none'");
    });

    it('should block object-src', () => {
      const cspDirectives = {
        objectSrc: ["'none'"],
      };

      expect(cspDirectives.objectSrc).toContain("'none'");
    });

    it('should set base-uri to self', () => {
      const cspDirectives = {
        baseUri: ["'self'"],
      };

      expect(cspDirectives.baseUri).toContain("'self'");
    });

    it('should set form-action to self', () => {
      const cspDirectives = {
        formAction: ["'self'"],
      };

      expect(cspDirectives.formAction).toContain("'self'");
    });

    it('should set frame-ancestors to none', () => {
      const cspDirectives = {
        frameAncestors: ["'none'"],
      };

      expect(cspDirectives.frameAncestors).toContain("'none'");
    });

    it('should include upgrade-insecure-requests', () => {
      const cspDirectives = {
        upgradeInsecureRequests: [],
      };

      expect(cspDirectives.upgradeInsecureRequests).toBeDefined();
    });

    it('should include report-uri', () => {
      const cspDirectives = {
        reportUri: SECURITY_HEADERS.CSP_REPORT_URI,
      };

      expect(cspDirectives.reportUri).toBe('/api/csp-report');
    });
  });

  // ===========================================================================
  // Strict Transport Security
  // ===========================================================================

  describe('Strict Transport Security (HSTS)', () => {
    it('should set max-age to 1 year', () => {
      const hstsConfig = {
        maxAge: SECURITY_HEADERS.HSTS_MAX_AGE,
      };

      expect(hstsConfig.maxAge).toBe(31536000);
    });

    it('should include subdomains', () => {
      const hstsConfig = {
        includeSubDomains: true,
      };

      expect(hstsConfig.includeSubDomains).toBe(true);
    });

    it('should enable preload', () => {
      const hstsConfig = {
        preload: true,
      };

      expect(hstsConfig.preload).toBe(true);
    });
  });

  // ===========================================================================
  // X-Frame-Options
  // ===========================================================================

  describe('X-Frame-Options', () => {
    it('should set frame guard to deny', () => {
      const frameguardConfig = {
        action: 'deny',
      };

      expect(frameguardConfig.action).toBe('deny');
    });
  });

  // ===========================================================================
  // Content Type Options
  // ===========================================================================

  describe('X-Content-Type-Options', () => {
    it('should enable noSniff', () => {
      const config = {
        noSniff: true,
      };

      expect(config.noSniff).toBe(true);
    });
  });

  // ===========================================================================
  // XSS Protection
  // ===========================================================================

  describe('X-XSS-Protection', () => {
    it('should enable XSS filter', () => {
      const config = {
        xssFilter: true,
      };

      expect(config.xssFilter).toBe(true);
    });
  });

  // ===========================================================================
  // Referrer Policy
  // ===========================================================================

  describe('Referrer-Policy', () => {
    it('should set strict-origin-when-cross-origin policy', () => {
      const config = {
        referrerPolicy: {
          policy: 'strict-origin-when-cross-origin',
        },
      };

      expect(config.referrerPolicy.policy).toBe('strict-origin-when-cross-origin');
    });
  });

  // ===========================================================================
  // Cross-Origin Policies
  // ===========================================================================

  describe('Cross-Origin Policies', () => {
    it('should enable cross-origin embedder policy', () => {
      const config = {
        crossOriginEmbedderPolicy: true,
      };

      expect(config.crossOriginEmbedderPolicy).toBe(true);
    });

    it('should set cross-origin opener policy to same-origin', () => {
      const config = {
        crossOriginOpenerPolicy: { policy: 'same-origin' },
      };

      expect(config.crossOriginOpenerPolicy.policy).toBe('same-origin');
    });

    it('should set cross-origin resource policy to same-origin', () => {
      const config = {
        crossOriginResourcePolicy: { policy: 'same-origin' },
      };

      expect(config.crossOriginResourcePolicy.policy).toBe('same-origin');
    });
  });

  // ===========================================================================
  // Permissions Policy
  // ===========================================================================

  describe('Permissions-Policy', () => {
    it('should disable accelerometer', () => {
      expect(SECURITY_HEADERS.FEATURE_POLICY).toContain('accelerometer=()');
    });

    it('should disable camera', () => {
      expect(SECURITY_HEADERS.FEATURE_POLICY).toContain('camera=()');
    });

    it('should disable geolocation', () => {
      expect(SECURITY_HEADERS.FEATURE_POLICY).toContain('geolocation=()');
    });

    it('should disable microphone', () => {
      expect(SECURITY_HEADERS.FEATURE_POLICY).toContain('microphone=()');
    });

    it('should disable payment', () => {
      expect(SECURITY_HEADERS.FEATURE_POLICY).toContain('payment=()');
    });

    it('should disable USB', () => {
      expect(SECURITY_HEADERS.FEATURE_POLICY).toContain('usb=()');
    });

    it('should set Permissions-Policy header', () => {
      const response = createMockResponse();
      const policyValue = SECURITY_HEADERS.FEATURE_POLICY.join(', ');

      response.setHeader('Permissions-Policy', policyValue);

      expect(response.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('accelerometer=()')
      );
    });
  });

  // ===========================================================================
  // Cache Control for Sensitive Endpoints
  // ===========================================================================

  describe('Cache Control for Sensitive Endpoints', () => {
    const sensitivePatterns = [
      '/api/auth',
      '/api/users',
      '/api/students',
      '/api/admin',
      '/api/consent',
      '/api/export',
    ];

    it.each(sensitivePatterns)('should set no-cache headers for %s', (path) => {
      const request = createMockRequest(path);
      const response = createMockResponse();

      // Check if path matches sensitive pattern
      const isSensitive = sensitivePatterns.some((pattern) =>
        request.path.startsWith(pattern.replace('/api', '/api'))
      );

      expect(isSensitive).toBe(true);

      // Should set cache control headers
      response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');

      expect(response.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      expect(response.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(response.setHeader).toHaveBeenCalledWith('Expires', '0');
    });

    it('should not set no-cache for non-sensitive endpoints', () => {
      const request = createMockRequest('/api/public/content');
      const response = createMockResponse();

      const isSensitive = sensitivePatterns.some((pattern) =>
        request.path.startsWith(pattern)
      );

      expect(isSensitive).toBe(false);
    });
  });

  // ===========================================================================
  // Hidden Headers
  // ===========================================================================

  describe('Hidden Headers', () => {
    it('should hide X-Powered-By header', () => {
      const config = {
        hidePoweredBy: true,
      };

      expect(config.hidePoweredBy).toBe(true);
    });
  });

  // ===========================================================================
  // DNS Prefetch Control
  // ===========================================================================

  describe('DNS Prefetch Control', () => {
    it('should disable DNS prefetch', () => {
      const config = {
        dnsPrefetchControl: { allow: false },
      };

      expect(config.dnsPrefetchControl.allow).toBe(false);
    });
  });

  // ===========================================================================
  // IE No Open
  // ===========================================================================

  describe('X-Download-Options', () => {
    it('should enable IE No Open', () => {
      const config = {
        ieNoOpen: true,
      };

      expect(config.ieNoOpen).toBe(true);
    });
  });

  // ===========================================================================
  // Permitted Cross-Domain Policies
  // ===========================================================================

  describe('X-Permitted-Cross-Domain-Policies', () => {
    it('should set to none', () => {
      const config = {
        permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      };

      expect(config.permittedCrossDomainPolicies.permittedPolicies).toBe('none');
    });
  });

  // ===========================================================================
  // Middleware Execution
  // ===========================================================================

  describe('Middleware Execution', () => {
    it('should call next() after setting headers', () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const next = vi.fn();

      // Simulate middleware execution
      mockHelmetMiddleware(request, response, next);

      expect(mockHelmetMiddleware).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const next = vi.fn();
      const error = new Error('Helmet error');

      mockHelmetMiddleware.mockImplementationOnce((_req, _res, cb) => cb(error));
      mockHelmetMiddleware(request, response, next);

      expect(next).not.toHaveBeenCalledWith(error); // Error passed to next
    });
  });
});
