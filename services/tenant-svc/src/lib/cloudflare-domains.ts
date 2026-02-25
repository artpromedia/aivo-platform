/**
 * Cloudflare Custom Hostnames Integration
 *
 * Uses Cloudflare for SaaS (SSL for SaaS) to manage custom domain
 * certificates and hostname routing for white-label tenants.
 *
 * @module lib/cloudflare-domains
 */

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface CustomHostnameResult {
  id: string;
  hostname: string;
  status: string;
  verificationTxt: string;
  sslStatus: string;
}

export interface HostnameStatusResult {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string;
  sslIssuedAt?: string;
  sslExpiresAt?: string;
  verificationErrors?: string[];
}

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
}

interface CloudflareHostname {
  id: string;
  hostname: string;
  status: string;
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  ssl: {
    status: string;
    certificates?: Array<{
      issued_on?: string;
      expires_on?: string;
    }>;
  };
  verification_errors?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// Manager
// ══════════════════════════════════════════════════════════════════════════════

const CF_API = 'https://api.cloudflare.com/client/v4';

export class CloudflareDomainManager {
  constructor(
    private readonly zoneId: string,
    private readonly apiToken: string,
    private readonly fallbackOrigin: string = 'custom.aivolearning.com',
  ) {}

  // ────────────────────── Add Custom Hostname ──────────────────────

  /**
   * Register a new custom hostname with Cloudflare for SaaS.
   * Cloudflare will begin DCV + SSL provisioning automatically.
   */
  async addCustomHostname(domain: string): Promise<CustomHostnameResult> {
    const response = await fetch(
      `${CF_API}/zones/${this.zoneId}/custom_hostnames`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostname: domain,
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              min_tls_version: '1.2',
              http2: 'on',
              early_hints: 'on',
            },
          },
          custom_metadata: {
            platform: 'aivo',
          },
        }),
      },
    );

    const data = (await response.json()) as CloudflareResponse<CloudflareHostname>;

    if (!data.success) {
      const msg = data.errors.map((e) => e.message).join(', ');
      throw new Error(`Cloudflare API error: ${msg}`);
    }

    return {
      id: data.result.id,
      hostname: data.result.hostname,
      status: data.result.status,
      verificationTxt: data.result.ownership_verification?.value ?? '',
      sslStatus: data.result.ssl?.status ?? 'pending',
    };
  }

  // ────────────────────── Check Hostname Status ──────────────────────

  /**
   * Poll for current verification + SSL certificate status.
   */
  async checkHostnameStatus(hostnameId: string): Promise<HostnameStatusResult> {
    const response = await fetch(
      `${CF_API}/zones/${this.zoneId}/custom_hostnames/${hostnameId}`,
      {
        headers: { Authorization: `Bearer ${this.apiToken}` },
      },
    );

    const data = (await response.json()) as CloudflareResponse<CloudflareHostname>;

    if (!data.success) {
      const msg = data.errors.map((e) => e.message).join(', ');
      throw new Error(`Cloudflare API error: ${msg}`);
    }

    const cert = data.result.ssl?.certificates?.[0];

    return {
      id: data.result.id,
      hostname: data.result.hostname,
      status: data.result.status,
      sslStatus: data.result.ssl?.status ?? 'pending',
      sslIssuedAt: cert?.issued_on,
      sslExpiresAt: cert?.expires_on,
      verificationErrors: data.result.verification_errors,
    };
  }

  // ────────────────────── Remove Custom Hostname ──────────────────────

  async removeCustomHostname(hostnameId: string): Promise<void> {
    const response = await fetch(
      `${CF_API}/zones/${this.zoneId}/custom_hostnames/${hostnameId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.apiToken}` },
      },
    );

    const data = (await response.json()) as CloudflareResponse<{ id: string }>;

    if (!data.success) {
      const msg = data.errors.map((e) => e.message).join(', ');
      throw new Error(`Cloudflare API error: ${msg}`);
    }
  }

  // ────────────────────── Verify Fallback Origin ──────────────────────

  /**
   * Ensure the fallback origin is configured for the zone.
   * Must be called once during initial setup.
   */
  async ensureFallbackOrigin(): Promise<string> {
    // Check existing
    const getRes = await fetch(
      `${CF_API}/zones/${this.zoneId}/custom_hostnames/fallback_origin`,
      {
        headers: { Authorization: `Bearer ${this.apiToken}` },
      },
    );

    const getData = (await getRes.json()) as CloudflareResponse<{ origin: string; status: string }>;

    if (getData.success && getData.result?.origin === this.fallbackOrigin) {
      return getData.result.origin;
    }

    // Set fallback origin
    const putRes = await fetch(
      `${CF_API}/zones/${this.zoneId}/custom_hostnames/fallback_origin`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ origin: this.fallbackOrigin }),
      },
    );

    const putData = (await putRes.json()) as CloudflareResponse<{ origin: string }>;

    if (!putData.success) {
      const msg = putData.errors.map((e) => e.message).join(', ');
      throw new Error(`Failed to set fallback origin: ${msg}`);
    }

    return putData.result.origin;
  }

  /** Check if the manager is configured (has credentials). */
  get isConfigured(): boolean {
    return !!(this.zoneId && this.apiToken);
  }
}
