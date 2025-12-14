/**
 * SSO Providers API Route
 * 
 * Returns list of configured SSO providers for the current tenant.
 * Used by the login page to display SSO buttons.
 */

import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

// Types for SSO provider info
interface SsoProviderInfo {
  id: string;
  name: string;
  type: 'GOOGLE_WORKSPACE' | 'MICROSOFT_ENTRA' | 'CLEVER' | 'CLASSLINK' | 'SAML' | 'OIDC';
  enabled: boolean;
  icon?: string;
}

interface IdpConfigResponse {
  id: string;
  name: string;
  protocol: string;
  issuer?: string;
  enabled: boolean;
}

interface SisProviderResponse {
  id: string;
  name: string;
  providerType: string;
  enabled: boolean;
}

/**
 * GET /api/auth/sso/providers
 * 
 * Returns available SSO providers for the tenant.
 * Tenant is determined by:
 * 1. Subdomain (e.g., acme.aivo.app)
 * 2. Cookie (tenant_slug)
 * 3. Query param (?tenant=acme)
 */
export async function GET(request: NextRequest) {
  try {
    // Determine tenant from various sources
    const tenantSlug = getTenantSlug(request);
    
    if (!tenantSlug) {
      // No tenant context - return empty list (show email login only)
      return NextResponse.json({ providers: [] });
    }

    // Fetch IdP configs from auth-svc
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const response = await fetch(`${authServiceUrl}/api/v1/tenants/${tenantSlug}/idp-configs`, {
      headers: {
        'Content-Type': 'application/json',
        // Forward internal service auth if needed
        ...(process.env.INTERNAL_API_KEY && {
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY,
        }),
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      // Tenant not found or auth service error - return empty list
      console.warn(`Failed to fetch SSO providers for tenant ${tenantSlug}: ${response.status}`);
      return NextResponse.json({ providers: [] });
    }

    const data = (await response.json()) as { idpConfigs?: IdpConfigResponse[] };
    
    // Transform IdP configs to SSO provider info
    const providers: SsoProviderInfo[] = (data.idpConfigs ?? [])
      .filter((config) => config.enabled)
      .map((config) => ({
        id: config.id,
        name: config.name,
        type: mapProtocolToType(config.protocol, config.issuer),
        enabled: true,
      }));

    // Also check for SIS providers that support SSO (Google Workspace, Microsoft Entra)
    const sisServiceUrl = process.env.SIS_SYNC_SERVICE_URL || 'http://localhost:3005';
    try {
      const sisResponse = await fetch(`${sisServiceUrl}/api/v1/tenants/${tenantSlug}/providers`, {
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.INTERNAL_API_KEY && {
            'X-Internal-API-Key': process.env.INTERNAL_API_KEY,
          }),
        },
        cache: 'no-store',
      });

      if (sisResponse.ok) {
        const sisData = (await sisResponse.json()) as { providers?: SisProviderResponse[] };
        const sisProviders: SsoProviderInfo[] = (sisData.providers ?? [])
          .filter((p) => 
            p.enabled && 
            ['GOOGLE_WORKSPACE', 'MICROSOFT_ENTRA'].includes(p.providerType)
          )
          .map((p) => ({
            id: `sis:${p.id}`, // Prefix to distinguish from IdP configs
            name: p.name,
            type: p.providerType as 'GOOGLE_WORKSPACE' | 'MICROSOFT_ENTRA',
            enabled: true,
          }));
        
        // Merge SIS providers if not already in IdP list (avoid duplicates)
        for (const sisProvider of sisProviders) {
          const exists = providers.some(p => 
            p.type === sisProvider.type && 
            p.name.toLowerCase().includes(sisProvider.name.toLowerCase())
          );
          if (!exists) {
            providers.push(sisProvider);
          }
        }
      }
    } catch {
      // SIS service unavailable - continue with IdP providers only
    }

    return NextResponse.json({ 
      providers,
      tenantSlug,
    });
  } catch (error) {
    console.error('Error fetching SSO providers:', error);
    return NextResponse.json({ providers: [] });
  }
}

/**
 * Extract tenant slug from request
 */
function getTenantSlug(request: NextRequest): string | null {
  // 1. Check query param
  const queryTenant = request.nextUrl.searchParams.get('tenant');
  if (queryTenant) return queryTenant;

  // 2. Check cookie
  const cookieStore = cookies();
  const cookieTenant = cookieStore.get('tenant_slug')?.value;
  if (cookieTenant) return cookieTenant;

  // 3. Check subdomain
  const host = request.headers.get('host') || '';
  const subdomain = extractSubdomain(host);
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    return subdomain;
  }

  return null;
}

/**
 * Extract subdomain from host
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0] ?? '';
  
  // Handle localhost
  if (!hostname || hostname === 'localhost') return null;
  
  // Split by dots
  const parts = hostname.split('.');
  
  // Need at least 3 parts for subdomain (e.g., acme.aivo.app)
  if (parts.length >= 3) {
    return parts[0] ?? null;
  }
  
  return null;
}

/**
 * Map IdP protocol/issuer to provider type
 */
function mapProtocolToType(
  protocol: string, 
  issuer?: string
): 'GOOGLE_WORKSPACE' | 'MICROSOFT_ENTRA' | 'CLEVER' | 'CLASSLINK' | 'SAML' | 'OIDC' {
  // Check issuer for known providers
  if (issuer) {
    if (issuer.includes('google.com') || issuer.includes('googleapis.com')) {
      return 'GOOGLE_WORKSPACE';
    }
    if (issuer.includes('microsoftonline.com') || issuer.includes('microsoft.com')) {
      return 'MICROSOFT_ENTRA';
    }
    if (issuer.includes('clever.com')) {
      return 'CLEVER';
    }
    if (issuer.includes('classlink.com')) {
      return 'CLASSLINK';
    }
  }
  
  // Fall back to protocol
  return protocol === 'SAML' ? 'SAML' : 'OIDC';
}
