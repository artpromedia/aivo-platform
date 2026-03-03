/**
 * Assignments BFF Route
 *
 * GET  /api/teacher/assignments — list assignments for the current teacher
 *
 * Proxies to the API gateway.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * GET /api/teacher/assignments
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const query = new URL(request.url).search;
    const res = await fetch(`${API_GATEWAY_URL}/api/teacher/assignments${query}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
    });

    if (!res.ok) {
      console.error('[Assignments BFF] gateway returned', res.status);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Assignments service unavailable' },
      { status: 502 },
    );
  }
}
