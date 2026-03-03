/**
 * Canvas LMS Integration API Proxy
 *
 * Proxies all /api/integrations/canvas/* requests to integration-svc.
 * The Canvas LMS configuration page calls this proxy, which forwards to
 * INTEGRATION_SVC_URL (default port 4021).
 *
 * Examples:
 *   GET    /api/integrations/canvas/status           → integration-svc GET  /canvas/status
 *   POST   /api/integrations/canvas/config           → integration-svc POST /canvas/config
 *   POST   /api/integrations/canvas/test-connection   → integration-svc POST /canvas/test-connection
 *   GET    /api/integrations/canvas/features          → integration-svc GET  /canvas/features
 *   PUT    /api/integrations/canvas/features          → integration-svc PUT  /canvas/features
 *   DELETE /api/integrations/canvas/disconnect        → integration-svc DELETE /canvas/disconnect
 *
 * Backend routes needed if integration-svc lacks them:
 *
 *  POST   /canvas/config
 *    Body: { platformId, clientId, deploymentId, jwksUrl, authorizationEndpoint,
 *            tokenEndpoint, oidcAuthEndpoint, instanceUrl }
 *    Registers or updates the LTI 1.3 configuration for a tenant.
 *
 *  POST   /canvas/test-connection
 *    Body: (same as config or empty — uses saved config)
 *    Validates connectivity to the Canvas instance and LTI key exchange.
 *    Returns: { success: boolean, message: string, details?: string }
 *
 *  GET    /canvas/status
 *    Returns: { connected, instanceUrl, connectedAt, lastSyncAt, coursesLinked }
 *
 *  GET    /canvas/features
 *    Returns: { assignmentIntegration, gradeSync, rosterSync }
 *
 *  PUT    /canvas/features
 *    Body: { assignmentIntegration?: boolean, gradeSync?: boolean, rosterSync?: boolean }
 *    Toggles individual feature flags.
 *
 *  DELETE /canvas/disconnect
 *    Removes all Canvas config and link data for the tenant.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INTEGRATION_SVC_URL =
  process.env.INTEGRATION_SVC_URL || 'http://localhost:4021';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = '/canvas/' + path.join('/');
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
    console.error(`[Canvas Proxy] Failed to reach ${upstream}:`, error);
    return NextResponse.json(
      { error: 'Integration service unavailable', upstream },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
