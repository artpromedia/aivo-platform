/**
 * Catch-all API Proxy Route
 *
 * Handles any /api/* path that doesn't have a dedicated BFF route handler.
 * Maps the first path segment to the correct backend service and proxies
 * the request at runtime (no build-time baking of URLs).
 *
 * Priority: Next.js App Router serves specific route.ts files first.
 * This catch-all only activates for paths without a dedicated handler.
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Service URL configuration — resolved at runtime from env vars
function getServiceUrl(segment: string): string | null {
  const PARENT_SVC = process.env.PARENT_SVC_URL || 'http://parent-svc:3000';
  const AUTH_SVC = process.env.AUTH_SVC_URL || 'http://auth-svc:3000';
  const BILLING_SVC = process.env.BILLING_SVC_URL || 'http://billing-svc:3000';
  const TUTOR_SVC = process.env.TUTOR_SVC_URL || 'http://tutor-svc:3000';
  const GAMIFICATION_SVC = process.env.GAMIFICATION_SVC_URL || 'http://gamification-svc:3000';

  const map: Record<string, string> = {
    parent: PARENT_SVC,
    auth: AUTH_SVC,
    billing: BILLING_SVC,
    tutor: TUTOR_SVC,
    gamification: GAMIFICATION_SVC,
    // These sub-domains of parent-svc
    messages: PARENT_SVC,
    caregiver: PARENT_SVC,
    homework: PARENT_SVC,
    onboarding: PARENT_SVC,
    reports: PARENT_SVC,
    learner: PARENT_SVC,
  };

  return map[segment] ?? null;
}

// Build the backend path from the proxy segments
function buildBackendPath(segments: string[]): string {
  const fullPath = segments.join('/');
  const firstSegment = segments[0];

  // gamification-svc uses /api/gamification/ prefix
  if (firstSegment === 'gamification') {
    return `/api/gamification/${segments.slice(1).join('/')}`;
  }

  // All other services use /api/v1/ prefix
  return `/api/v1/${fullPath}`;
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
): Promise<NextResponse> {
  const { proxy: segments } = await params;

  if (segments.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const firstSegment = segments[0];
  const serviceUrl = getServiceUrl(firstSegment);

  if (!serviceUrl) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Read auth token from cookie
  const cookieStore = await cookies();
  const token =
    cookieStore.get('aivo_access_token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendPath = buildBackendPath(segments);
  const targetUrl = new URL(backendPath, serviceUrl);

  // Forward query parameters
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // Build headers — forward auth + content-type
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  // Decode JWT to inject identity headers for backend services
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as {
      tenantId?: string;
      sub?: string;
      roles?: string[];
    };
    if (payload.tenantId) headers['x-tenant-id'] = payload.tenantId;
    if (payload.sub) headers['x-user-id'] = payload.sub;
    if (payload.roles) headers['x-user-roles'] = JSON.stringify(payload.roles);
  } catch {
    // JWT decode failed — send request without identity headers
  }

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = await request.text();
    }

    const response = await fetch(targetUrl.toString(), fetchOptions);

    // Stream the response back
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Skip hop-by-hop headers
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Failed to proxy ${request.method} ${targetUrl.toString()}`, error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
