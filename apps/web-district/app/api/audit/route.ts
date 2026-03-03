/**
 * Audit API Route
 *
 * Proxy to analytics-svc for audit event listing.
 * Supports filtering by date range, action type, role, search, and pagination.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3010';

// GET /api/audit — list audit events with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('Authorization') || '';

    // Forward all query params to analytics-svc
    const params = new URLSearchParams();
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const action = searchParams.get('action');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    const tab = searchParams.get('tab');

    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (action) params.set('action', action);
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    if (page) params.set('page', page);
    if (pageSize) params.set('pageSize', pageSize);
    if (tab) params.set('tab', tab);

    const url = `${ANALYTICS_SERVICE_URL}/audit?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Analytics service error: ${text}` },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }
}
