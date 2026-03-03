/**
 * Google Classroom Integration API Proxy
 *
 * Proxies all /api/integrations/google-classroom/* requests to integration-svc.
 * The Google Classroom dashboard page calls this proxy, which forwards to
 * INTEGRATION_SVC_URL (default port 4021).
 *
 * Examples:
 *   GET  /api/integrations/google-classroom/status        → integration-svc GET /google-classroom/status
 *   GET  /api/integrations/google-classroom/courses       → integration-svc GET /google-classroom/courses
 *   POST /api/integrations/google-classroom/sync/all      → integration-svc POST /google-classroom/sync/all
 *   DELETE /api/integrations/google-classroom/auth/disconnect → integration-svc DELETE /google-classroom/auth/disconnect
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INTEGRATION_SVC_URL =
  process.env.INTEGRATION_SVC_URL || 'http://localhost:4021';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = '/google-classroom/' + path.join('/');
  const url = new URL(request.url);
  const query = url.search;
  const upstream = `${INTEGRATION_SVC_URL}${targetPath}${query}`;

  try {
    const headers = new Headers();

    // Forward content-type and auth headers
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    const authorization = request.headers.get('authorization');
    if (authorization) headers.set('authorization', authorization);

    // Forward tenant context
    const tenantId = request.headers.get('x-tenant-id');
    if (tenantId) headers.set('x-tenant-id', tenantId);
    const userId = request.headers.get('x-user-id');
    if (userId) headers.set('x-user-id', userId);

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward body for non-GET/HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = await request.text();
    }

    const response = await fetch(upstream, fetchOptions);
    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error(`[Google Classroom Proxy] Failed to reach ${upstream}:`, error);
    return NextResponse.json(
      { error: 'Integration service unavailable', upstream },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
