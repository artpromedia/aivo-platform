/**
 * Lessons BFF Route
 *
 * GET  /api/teacher/lessons — list lessons for the current teacher
 * POST /api/teacher/lessons — create a new lesson
 *
 * Proxies to content-svc.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CONTENT_SVC_URL =
  process.env.NEXT_PUBLIC_CONTENT_SVC_URL ?? 'http://localhost:3010';

/**
 * GET /api/teacher/lessons
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const query = new URL(request.url).search;
    const res = await fetch(`${CONTENT_SVC_URL}/lessons${query}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
    });

    if (!res.ok) {
      console.error('[Lessons BFF] content-svc returned', res.status);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Lessons service unavailable' },
      { status: 502 },
    );
  }
}

/**
 * POST /api/teacher/lessons
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();

    const res = await fetch(`${CONTENT_SVC_URL}/lessons`, {
      method: 'POST',
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
        { error: errData.message || 'Failed to create lesson' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Lessons service unavailable' },
      { status: 502 },
    );
  }
}
