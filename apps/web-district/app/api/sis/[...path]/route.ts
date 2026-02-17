/**
 * SIS Sync API Proxy
 *
 * Proxies all /api/sis/* requests to the sis-sync-svc backend.
 * The SisIntegrationPage.tsx client calls API_BASE (/api/sis) + /v1/...
 * and this handler forwards them to SIS_SYNC_SVC_URL.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SIS_SYNC_SVC_URL =
  process.env.SIS_SYNC_SVC_URL || 'http://localhost:4016';

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = '/' + path.join('/');
  const url = new URL(request.url);
  const query = url.search; // includes leading '?'
  const upstream = `${SIS_SYNC_SVC_URL}/api${targetPath}${query}`;

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
    console.error(`[SIS Proxy] Failed to reach ${upstream}:`, error);
    return NextResponse.json(
      { error: 'SIS sync service unavailable', upstream },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
