/**
 * Redirect URI Validator
 *
 * Validates redirect URIs against a whitelist to prevent open redirect attacks.
 * This is a critical security control for OAuth/SSO flows.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
 */

import { prisma } from '../../prisma.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RedirectValidationResult {
  valid: boolean;
  error?: string;
}

export interface RedirectValidatorConfig {
  /** Require HTTPS for all redirects (should be true in production) */
  requireHttps: boolean;
  /** Global allowed domains (in addition to tenant-specific) */
  globalAllowedDomains: string[];
  /** Allowed path patterns (regex) */
  allowedPathPatterns: RegExp[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const defaultConfig: RedirectValidatorConfig = {
  requireHttps: process.env.NODE_ENV === 'production',
  globalAllowedDomains: [
    // Add your platform's domains here
    // These should be loaded from environment in production
  ],
  allowedPathPatterns: [
    /^\/auth\/callback$/,
    /^\/oauth\/callback$/,
    /^\/sso\/callback$/,
    /^\/login\/callback$/,
    /^\/$/,
  ],
};

// Load global allowed domains from environment
if (process.env.SSO_ALLOWED_DOMAINS) {
  defaultConfig.globalAllowedDomains = process.env.SSO_ALLOWED_DOMAINS.split(',')
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

// ============================================================================
// REDIRECT VALIDATOR
// ============================================================================

export class RedirectValidator {
  private readonly config: RedirectValidatorConfig;
  private readonly tenantDomainsCache = new Map<string, { domains: string[]; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<RedirectValidatorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Validate a redirect URI for a specific tenant.
   *
   * Checks:
   * 1. URL is valid and parseable
   * 2. Protocol is HTTPS (in production)
   * 3. No credentials in URL
   * 4. Domain is in tenant's allowed list OR global allowed list
   * 5. Path matches allowed patterns
   *
   * @param redirectUri - The redirect URI to validate
   * @param tenantId - The tenant ID (for tenant-specific validation)
   * @returns Validation result
   */
  async validate(redirectUri: string, tenantId: string): Promise<RedirectValidationResult> {
    // Parse URL
    let url: URL;
    try {
      url = new URL(redirectUri);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Check protocol
    if (this.config.requireHttps && url.protocol !== 'https:') {
      // Allow localhost in development
      const isLocalhost =
        url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';

      if (!isLocalhost || process.env.NODE_ENV === 'production') {
        return { valid: false, error: 'Redirect URI must use HTTPS' };
      }
    }

    // Block non-http(s) protocols
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { valid: false, error: `Invalid protocol: ${url.protocol}` };
    }

    // No credentials in URL
    if (url.username || url.password) {
      return { valid: false, error: 'Redirect URI must not contain credentials' };
    }

    // No fragments (they shouldn't be sent to server anyway)
    if (url.hash) {
      return { valid: false, error: 'Redirect URI must not contain fragment' };
    }

    // Get allowed domains for tenant
    const allowedDomains = await this.getAllowedDomains(tenantId);

    // Check domain against whitelist
    const isAllowedDomain = this.isDomainAllowed(url.hostname, allowedDomains);
    if (!isAllowedDomain) {
      return {
        valid: false,
        error: `Domain not allowed: ${url.hostname}. Contact your administrator to add this domain.`,
      };
    }

    // Check path against allowed patterns (if configured)
    if (this.config.allowedPathPatterns.length > 0) {
      const isAllowedPath = this.config.allowedPathPatterns.some((pattern) =>
        pattern.test(url.pathname)
      );
      if (!isAllowedPath) {
        return {
          valid: false,
          error: `Path not allowed: ${url.pathname}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get the validated redirect URI or throw an error.
   */
  async getValidatedUri(redirectUri: string, tenantId: string): Promise<string> {
    const result = await this.validate(redirectUri, tenantId);
    if (!result.valid) {
      throw new RedirectValidationError(result.error || 'Invalid redirect URI');
    }
    return redirectUri;
  }

  /**
   * Get allowed domains for a tenant (with caching).
   */
  private async getAllowedDomains(tenantId: string): Promise<string[]> {
    // Check cache
    const cached = this.tenantDomainsCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.domains;
    }

    // Fetch from database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        allowedRedirectDomains: true,
        domain: true,
      },
    });

    // Combine tenant-specific domains with global domains
    const domains: string[] = [
      ...this.config.globalAllowedDomains,
      // Add tenant's primary domain
      ...(tenant?.domain ? [tenant.domain] : []),
      // Add tenant's configured allowed redirect domains
      ...((tenant?.allowedRedirectDomains as string[] | undefined) ?? []),
    ];

    // Cache the result
    this.tenantDomainsCache.set(tenantId, {
      domains,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return domains;
  }

  /**
   * Check if a hostname matches any allowed domain pattern.
   *
   * Supports:
   * - Exact match: "app.example.com"
   * - Wildcard subdomain: "*.example.com" (matches foo.example.com, bar.example.com)
   */
  private isDomainAllowed(hostname: string, allowedDomains: string[]): boolean {
    const normalizedHostname = hostname.toLowerCase();

    for (const domain of allowedDomains) {
      const normalizedDomain = domain.toLowerCase().trim();

      // Exact match
      if (normalizedHostname === normalizedDomain) {
        return true;
      }

      // Wildcard subdomain match
      if (normalizedDomain.startsWith('*.')) {
        const baseDomain = normalizedDomain.slice(2);

        // Match the base domain itself
        if (normalizedHostname === baseDomain) {
          return true;
        }

        // Match subdomains
        if (normalizedHostname.endsWith(`.${baseDomain}`)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Clear the tenant domains cache.
   */
  clearCache(): void {
    this.tenantDomainsCache.clear();
  }

  /**
   * Clear cache for a specific tenant.
   */
  clearTenantCache(tenantId: string): void {
    this.tenantDomainsCache.delete(tenantId);
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class RedirectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedirectValidationError';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const redirectValidator = new RedirectValidator();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate a redirect URI (convenience function).
 */
export async function validateRedirectUri(
  redirectUri: string,
  tenantId: string
): Promise<RedirectValidationResult> {
  return redirectValidator.validate(redirectUri, tenantId);
}

/**
 * Get a validated redirect URI or throw.
 */
export async function getValidatedRedirectUri(
  redirectUri: string,
  tenantId: string
): Promise<string> {
  return redirectValidator.getValidatedUri(redirectUri, tenantId);
}
