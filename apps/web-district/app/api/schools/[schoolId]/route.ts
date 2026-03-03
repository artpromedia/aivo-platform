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
    const { tenantId, ...fields } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId as string}/schools/${schoolId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to update school' },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
  }
}

// DELETE /api/schools/:schoolId — delete a school
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    const tenantId = new URL(request.url).searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId}/schools/${schoolId}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to delete school' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete school' }, { status: 500 });
  }
}
