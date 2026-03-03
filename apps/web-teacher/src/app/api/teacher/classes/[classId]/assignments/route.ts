/**
 * Class Assignments BFF Route
 *
 * GET  /api/teacher/classes/[classId]/assignments — list assignments for a class
 * POST /api/teacher/classes/[classId]/assignments — create assignment in a class
 *
 * Proxies to the API gateway.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RouteContext = { params: Promise<{ classId: string }> };

/**
 * GET /api/teacher/classes/[classId]/assignments
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { classId } = await context.params;

  try {
    const query = new URL(request.url).search;
    const res = await fetch(
      `${API_GATEWAY_URL}/api/teacher/classes/${classId}/assignments${query}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'X-Tenant-Id': session.tenantId,
          'X-User-Id': session.userId,
          'X-Internal-Service': 'web-teacher',
        },
      },
    );

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errData.message || 'Failed to fetch class assignments' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Assignments service unavailable' }, { status: 502 });
  }
}

/**
 * POST /api/teacher/classes/[classId]/assignments
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { classId } = await context.params;

  try {
    const body: unknown = await request.json();
    const res = await fetch(
      `${API_GATEWAY_URL}/api/teacher/classes/${classId}/assignments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'X-Tenant-Id': session.tenantId,
          'X-User-Id': session.userId,
          'X-Internal-Service': 'web-teacher',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errData.message || 'Failed to create assignment' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Assignments service unavailable' }, { status: 502 });
  }
}
