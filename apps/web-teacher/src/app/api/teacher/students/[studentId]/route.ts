/**
 * Single Student BFF Route
 *
 * GET /api/teacher/students/[studentId] — get student detail
 *
 * Proxies to the API gateway.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RouteContext = { params: Promise<{ studentId: string }> };

/**
 * GET /api/teacher/students/[studentId]
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { studentId } = await context.params;

  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/teacher/students/${studentId}`, {
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
        { error: errData.message || 'Failed to fetch student' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Students service unavailable' }, { status: 502 });
  }
}
