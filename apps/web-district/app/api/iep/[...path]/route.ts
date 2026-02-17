/**
 * IEP Service API Proxy for District Dashboard
 *
 * Sprint T2-05: Proxies /api/iep/* to iep-svc (port 4070) so the
 * district compliance panel can fetch compliance reports and alerts.
 *
 * Examples:
 *   GET  /api/iep/compliance/report?format=csv  → iep-svc GET /compliance/report?format=csv
 *   GET  /api/iep/compliance/alerts              → iep-svc GET /compliance/alerts
 *   GET  /api/iep/ieps/dashboard                 → iep-svc GET /ieps/dashboard
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const IEP_SVC_URL = process.env.IEP_SVC_URL || 'http://localhost:4070';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = '/' + path.join('/');
  const url = new URL(request.url);
  const query = url.search;
  const upstream = `${IEP_SVC_URL}${targetPath}${query}`;

  try {
    const headers = new Headers();

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
        ...(response.headers.get('content-disposition')
          ? { 'content-disposition': response.headers.get('content-disposition')! }
          : {}),
      },
    });
  } catch (error) {
    console.error(`[IEP Proxy] Failed to reach ${upstream}:`, error);
    return NextResponse.json({ error: 'IEP service unavailable', upstream }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
