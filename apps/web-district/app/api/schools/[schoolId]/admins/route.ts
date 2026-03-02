/**
 * School Admins API Routes
 *
 * GET  /api/schools/[schoolId]/admins — list current admins for a school
 * POST /api/schools/[schoolId]/admins — assign a user as school admin
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const TENANT_SVC_URL = process.env.TENANT_SVC_URL || 'http://localhost:4002';

export interface SchoolAdmin {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  assignedAt: string;
}

// GET /api/schools/[schoolId]/admins
export async function GET(
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
      `${TENANT_SVC_URL}/tenants/${tenantId}/schools/${schoolId}/admins`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      // Backend may not have this endpoint yet — return empty list
      if (response.status === 404) {
        return NextResponse.json({ admins: [] });
      }
      throw new Error(`Failed to fetch school admins: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch school admins' }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/admins — assign a user as SCHOOL_ADMIN
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    const body = (await request.json()) as {
      tenantId?: string;
      userId?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
    };

    const { tenantId, userId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const response = await fetch(
      `${TENANT_SVC_URL}/tenants/${tenantId}/schools/${schoolId}/admins`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: 'SCHOOL_ADMIN',
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: errText || 'Failed to assign admin' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to assign school admin' }, { status: 500 });
  }
}
