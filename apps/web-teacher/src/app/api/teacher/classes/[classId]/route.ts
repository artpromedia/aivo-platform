/**
 * Single Class BFF Route
 *
 * GET   /api/teacher/classes/[classId] — get a single class
 * PATCH /api/teacher/classes/[classId] — update a class
 * DELETE /api/teacher/classes/[classId] — delete / archive a class
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
 * GET /api/teacher/classes/[classId]
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { classId } = await context.params;

  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/teacher/classes/${classId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errData.message || 'Failed to fetch class' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Classes service unavailable' }, { status: 502 });
  }
}

/**
 * PATCH /api/teacher/classes/[classId]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { classId } = await context.params;

  try {
    const body: unknown = await request.json();
    const res = await fetch(`${API_GATEWAY_URL}/api/teacher/classes/${classId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errData.message || 'Failed to update class' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Classes service unavailable' }, { status: 502 });
  }
}

/**
 * DELETE /api/teacher/classes/[classId]
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { classId } = await context.params;

  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/teacher/classes/${classId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errData.message || 'Failed to delete class' },
        { status: res.status },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Classes service unavailable' }, { status: 502 });
  }
}
