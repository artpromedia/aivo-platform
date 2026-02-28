/**
 * Single School API Route
 *
 * GET /api/schools/[schoolId] — fetch a single school by ID
 * PATCH /api/schools/[schoolId] — update a school
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const TENANT_SVC_URL = process.env.TENANT_SVC_URL || 'http://localhost:4002';

// GET /api/schools/:schoolId — fetch single school
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    const tenantId = new URL(_request.url).searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Fetch all schools for the tenant and find the one matching schoolId
    const response = await fetch(`${TENANT_SVC_URL}/tenants/${tenantId}/schools`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schools: ${response.status}`);
    }

    const data = (await response.json()) as {
      items: { id: string; [key: string]: unknown }[];
    };
    const school = data.items.find((s) => s.id === schoolId);

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Also fetch classrooms for this school
    let classrooms: unknown[] = [];
    try {
      const crRes = await fetch(`${TENANT_SVC_URL}/schools/${schoolId}/classrooms`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (crRes.ok) {
        const crData = (await crRes.json()) as { items: unknown[] };
        classrooms = crData.items;
      }
    } catch {
      // Classrooms are optional — continue without them
    }

    return NextResponse.json({ ...school, classrooms });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch school' }, { status: 500 });
  }
}

// PATCH /api/schools/:schoolId — update a school
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const { tenantId, name, address, external_id } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // tenant-svc doesn't have a PATCH endpoint yet — respond with 501
    // This allows the UI to show the Edit button and form, ready for backend support
    void schoolId;
    void name;
    void address;
    void external_id;

    return NextResponse.json(
      { error: 'School update is not yet supported by the backend' },
      { status: 501 }
    );
  } catch {
    return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
  }
}
