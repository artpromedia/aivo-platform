/**
 * Audit Export API Route
 *
 * Proxy to analytics-svc for exporting audit log as CSV.
 * Streams the CSV response as a file download.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3010';

// GET /api/audit/export — export audit events as CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('Authorization') || '';

    // Forward filter params
    const params = new URLSearchParams();
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const action = searchParams.get('action');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (action) params.set('action', action);
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    params.set('format', 'csv');

    const url = `${ANALYTICS_SERVICE_URL}/audit/export?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: 'text/csv',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Export failed: ${text}` },
        { status: response.status }
      );
    }

    const csvData = await response.text();
    const now = new Date().toISOString().slice(0, 10);

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${now}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to export audit log' }, { status: 500 });
  }
}
