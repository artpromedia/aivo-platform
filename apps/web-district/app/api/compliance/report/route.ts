/**
 * Compliance Report API Route
 *
 * POST /api/compliance/report       — generate a new compliance report
 * GET  /api/compliance/report        — download a compliance report in the requested format
 *
 * Proxies to iep-svc at /compliance/report.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const IEP_SVC_URL = process.env.IEP_SVC_URL || 'http://localhost:4070';

// POST /api/compliance/report — generate a report
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const tenantId =
      request.headers.get('x-tenant-id') ??
      (body.tenantId as string | undefined) ??
      '';

    const response = await fetch(`${IEP_SVC_URL}/compliance/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: errText || 'Failed to generate report' },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Compliance report service unavailable' },
      { status: 502 }
    );
  }
}

// GET /api/compliance/report?format=pdf|csv|json — download a report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    const reportId = searchParams.get('reportId') || '';
    const tenantId = searchParams.get('tenantId') || '';

    const params = new URLSearchParams({ format });
    if (reportId) params.set('reportId', reportId);
    if (tenantId) params.set('tenantId', tenantId);

    const response = await fetch(
      `${IEP_SVC_URL}/compliance/report?${params}`,
      {
        headers: {
          ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: errText || 'Failed to download report' },
        { status: response.status }
      );
    }

    // Stream the file back to the browser
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const disposition =
      response.headers.get('content-disposition') ||
      `attachment; filename="compliance-report.${format}"`;

    const blob = await response.arrayBuffer();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Compliance report service unavailable' },
      { status: 502 }
    );
  }
}
