/**
 * SSO Initiate API Route
 * 
 * Initiates SSO flow by redirecting to the appropriate IdP.
 */

import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

interface OAuthInitResponse {
  authUrl: string;
}

/**
 * GET /api/auth/sso/initiate
 * 
 * Initiates SSO flow for a specific provider.
 * Query params:
 * - provider: Provider ID (required)
 * - redirect_uri: Where to redirect after SSO (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const providerId = request.nextUrl.searchParams.get('provider');
    const redirectUri = request.nextUrl.searchParams.get('redirect_uri');
    
    if (!providerId) {
      return NextResponse.json(
        { error: 'Missing provider parameter' },
        { status: 400 }
      );
    }

    // Determine tenant
    const tenantSlug = getTenantSlug(request);
    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Unable to determine tenant' },
        { status: 400 }
      );
    }

    // Check if this is a SIS provider (prefixed with "sis:")
    if (providerId.startsWith('sis:')) {
      // This is a SIS provider with OAuth - redirect to SIS service OAuth flow
      const sisProviderId = providerId.replace('sis:', '');
      const sisServiceUrl = process.env.SIS_SYNC_SERVICE_URL || 'http://localhost:3005';
      
      // Get OAuth initiation URL from SIS service
      const response = await fetch(
        `${sisServiceUrl}/api/v1/providers/${sisProviderId}/oauth/initiate?for_sso=true`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.INTERNAL_API_KEY && {
              'X-Internal-API-Key': process.env.INTERNAL_API_KEY,
            }),
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to initiate SSO with SIS provider' },
          { status: response.status }
        );
      }

      const data = (await response.json()) as OAuthInitResponse;
      return NextResponse.json({ redirectUrl: data.authUrl });
    }

    // Regular IdP config - use auth-svc SSO endpoint
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    // Build the SSO initiation URL
    const ssoUrl = new URL(`${authServiceUrl}/auth/sso/${tenantSlug}`);
    if (redirectUri) {
      ssoUrl.searchParams.set('redirect_uri', redirectUri);
    }
    ssoUrl.searchParams.set('idp_id', providerId);
    ssoUrl.searchParams.set('client_type', 'web');

    // For web, we redirect the browser directly
    // Return the URL for the client to redirect
    return NextResponse.json({ 
      redirectUrl: ssoUrl.toString(),
    });
  } catch (error) {
    console.error('Error initiating SSO:', error);
    return NextResponse.json(
      { error: 'Failed to initiate SSO' },
      { status: 500 }
    );
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
  const hostname = host.split(':')[0] ?? '';
  if (!hostname || hostname === 'localhost') return null;
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0] ?? null;
  }
  return null;
}
