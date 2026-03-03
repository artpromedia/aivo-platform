/**
 * Ed-Fi Integration API Proxy
 *
 * Proxies all /api/integrations/edfi/* requests to edfi-svc.
 * The Ed-Fi Reporting page calls this proxy, which forwards to
 * EDFI_SERVICE_URL (default port 4030).
 *
 * Examples:
 *   GET    /api/integrations/edfi/config            → edfi-svc GET    /edfi/config
 *   POST   /api/integrations/edfi/config            → edfi-svc POST   /edfi/config
 *   POST   /api/integrations/edfi/test-connection   → edfi-svc POST   /edfi/test-connection
 *   POST   /api/integrations/edfi/export            → edfi-svc POST   /edfi/export
 *   GET    /api/integrations/edfi/exports            → edfi-svc GET    /edfi/exports
 *   GET    /api/integrations/edfi/exports/:id        → edfi-svc GET    /edfi/exports/:id
 *   POST   /api/integrations/edfi/exports/:id/rerun → edfi-svc POST   /edfi/exports/:id/rerun
 *   GET    /api/integrations/edfi/schedule           → edfi-svc GET    /edfi/schedule
 *   POST   /api/integrations/edfi/schedule           → edfi-svc POST   /edfi/schedule
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EDFI_SERVICE_URL =
  process.env.EDFI_SERVICE_URL || 'http://localhost:4030';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = '/edfi/' + path.join('/');
  const url = new URL(request.url);
  const query = url.search;
  const upstream = `${EDFI_SERVICE_URL}${targetPath}${query}`;

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
    console.error(`[Ed-Fi Proxy] Failed to reach ${upstream}:`, error);
    return NextResponse.json(
      { error: 'Ed-Fi service unavailable', upstream },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
