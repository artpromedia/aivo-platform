/**
 * Single Assignment BFF Route
 *
 * GET    /api/teacher/assignments/[assignmentId] — get assignment detail
 * PATCH  /api/teacher/assignments/[assignmentId] — update an assignment
 * DELETE /api/teacher/assignments/[assignmentId] — delete an assignment
 *
 * Proxies to the API gateway.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RouteContext = { params: Promise<{ assignmentId: string }> };

/**
 * GET /api/teacher/assignments/[assignmentId]
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { assignmentId } = await context.params;

  try {
    const res = await fetch(
      `${API_GATEWAY_URL}/api/teacher/assignments/${assignmentId}`,
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
        { error: errData.message || 'Failed to fetch assignment' },
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
 * PATCH /api/teacher/assignments/[assignmentId]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { assignmentId } = await context.params;

  try {
    const body: unknown = await request.json();
    const res = await fetch(
      `${API_GATEWAY_URL}/api/teacher/assignments/${assignmentId}`,
      {
        method: 'PATCH',
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
        { error: errData.message || 'Failed to update assignment' },
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
 * DELETE /api/teacher/assignments/[assignmentId]
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { assignmentId } = await context.params;

  try {
    const res = await fetch(
      `${API_GATEWAY_URL}/api/teacher/assignments/${assignmentId}`,
      {
        method: 'DELETE',
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
        { error: errData.message || 'Failed to delete assignment' },
        { status: res.status },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Assignments service unavailable' }, { status: 502 });
  }
}
