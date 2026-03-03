/**
 * Classrooms API Routes
 *
 * GET  /api/classrooms — list classrooms for a tenant
 * POST /api/classrooms — create a new classroom
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const TENANT_SVC_URL = process.env.TENANT_SVC_URL || 'http://localhost:4002';

// GET /api/classrooms — list classrooms for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId}/classrooms`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ items: [], total: 0 });
      }
      throw new Error(`Failed to fetch classrooms: ${response.status}`);
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch classrooms' }, { status: 500 });
  }
}

// POST /api/classrooms — create a new classroom
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { tenantId, name, schoolId, gradeLevel, teacherId } = body;

    if (!tenantId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, name' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId as string}/classrooms`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, schoolId, gradeLevel, teacherId }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to create classroom' },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
  }
}
