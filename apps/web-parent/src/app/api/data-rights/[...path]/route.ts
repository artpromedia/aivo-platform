/**
 * Parent Data Rights API Proxy
 *
 * Sprint T2-05: Proxies /api/data-rights/* to parent-svc (port 3010)
 * for FERPA data export, deletion, and correction requests.
 *
 * Examples:
 *   GET  /api/data-rights/student123/data/export         → parent-svc GET  /parent/students/student123/data/export
 *   POST /api/data-rights/student123/data/correction      → parent-svc POST /parent/students/student123/data/correction
 *   POST /api/data-rights/student123/data/delete           → parent-svc POST /parent/students/student123/data/delete
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = '/parent/students/' + path.join('/');
  const url = new URL(request.url);
  const query = url.search;
  const upstream = `${PARENT_SVC_URL}/api/v1${targetPath}${query}`;

  try {
    const headers = new Headers();

    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    const authorization = request.headers.get('authorization');
    if (authorization) headers.set('authorization', authorization);
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);

    // Forward tenant + user context
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
        ...(response.headers.get('x-data-export-id')
          ? { 'x-data-export-id': response.headers.get('x-data-export-id')! }
          : {}),
      },
    });
  } catch (error) {
    console.error(`[DataRights Proxy] Failed to reach ${upstream}:`, error);
    return NextResponse.json(
      { error: 'Data rights service unavailable', upstream },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
