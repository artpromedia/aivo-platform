/**
 * Single Classroom API Routes
 *
 * GET    /api/classrooms/[classroomId] — fetch a single classroom
 * PATCH  /api/classrooms/[classroomId] — update a classroom
 * DELETE /api/classrooms/[classroomId] — delete a classroom
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const TENANT_SVC_URL = process.env.TENANT_SVC_URL || 'http://localhost:4002';

// GET /api/classrooms/:classroomId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;
    const tenantId = new URL(request.url).searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId}/classrooms/${classroomId}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }
      throw new Error(`Failed to fetch classroom: ${response.status}`);
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch classroom' }, { status: 500 });
  }
}

// PATCH /api/classrooms/:classroomId — update a classroom
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const { tenantId, ...fields } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId as string}/classrooms/${classroomId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to update classroom' },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 });
  }
}

// DELETE /api/classrooms/:classroomId — delete a classroom
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params;
    const tenantId = new URL(request.url).searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId}/classrooms/${classroomId}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: error || 'Failed to delete classroom' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 });
  }
}
