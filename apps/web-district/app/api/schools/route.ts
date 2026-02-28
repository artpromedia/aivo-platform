/**
 * Schools API Routes
 *
 * Proxy to tenant-svc for school management.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const TENANT_SVC_URL = process.env.TENANT_SVC_URL || 'http://localhost:4002';

// GET /api/schools — list schools for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const response = await fetch(`${TENANT_SVC_URL}/tenants/${tenantId}/schools`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schools: ${response.status}`);
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
  }
}

// POST /api/schools — create a new school
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { tenantId, name, address, external_id } = body;

    if (!tenantId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, name' },
        { status: 400 }
      );
    }

    const response = await fetch(`${TENANT_SVC_URL}/tenants/${tenantId as string}/schools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, external_id }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to create school' },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
  }
}
