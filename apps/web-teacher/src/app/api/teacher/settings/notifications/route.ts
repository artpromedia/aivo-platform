/**
 * Teacher Notification Preferences API Route
 *
 * GET  /api/teacher/settings/notifications — fetch notification preferences
 * PUT  /api/teacher/settings/notifications — update notification preferences
 *
 * Proxies to notify-svc.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL || 'http://localhost:3460';

/**
 * GET /api/teacher/settings/notifications
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${NOTIFY_SVC_URL}/notifications/preferences?userId=${session.userId}`,
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
      // Return defaults when notify-svc has no saved preferences
      if (res.status === 404) {
        return NextResponse.json({
          sessionUpdates: true,
          achievements: true,
          messages: true,
          reminders: true,
          alerts: true,
          weeklyDigest: false,
          quietHoursStart: null,
          quietHoursEnd: null,
        });
      }
      console.error('[Notification Prefs API] notify-svc returned', res.status);
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Notification service unavailable' },
      { status: 502 },
    );
  }
}

/**
 * PUT /api/teacher/settings/notifications
 */
export async function PUT(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const res = await fetch(`${NOTIFY_SVC_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
      body: JSON.stringify({ ...body, userId: session.userId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            (errData as { message?: string }).message ||
            'Failed to update notification preferences',
        },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Notification service unavailable' },
      { status: 502 },
    );
  }
}
