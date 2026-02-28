/**
 * Teacher Grading Settings API Route
 *
 * GET  /api/teacher/settings/grading — fetch grading preferences
 * PUT  /api/teacher/settings/grading — update grading preferences
 *
 * Proxies to analytics-svc.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ANALYTICS_SVC_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:4030';

/**
 * GET /api/teacher/settings/grading
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${ANALYTICS_SVC_URL}/teacher-settings?tenantId=${session.tenantId}&userId=${session.userId}`,
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
      // Return sensible defaults when analytics-svc is unreachable
      if (res.status === 404) {
        return NextResponse.json({
          gradingScale: 'standard',
          lateWorkPolicy: '10_per_day_max_50',
          dropLowest: true,
          roundingRule: 'standard',
        });
      }
      console.error('[Grading Settings API] analytics-svc returned', res.status);
      return NextResponse.json(
        { error: 'Failed to fetch grading settings' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Settings service unavailable' },
      { status: 502 },
    );
  }
}

/**
 * PUT /api/teacher/settings/grading
 */
export async function PUT(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const res = await fetch(`${ANALYTICS_SVC_URL}/teacher-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
      body: JSON.stringify({ ...body, tenantId: session.tenantId, userId: session.userId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (errData as { message?: string }).message || 'Failed to update grading settings' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Settings service unavailable' },
      { status: 502 },
    );
  }
}
