/**
 * Teacher Notifications API Route
 *
 * GET  /api/notifications — fetch recent notifications for the teacher
 * POST /api/notifications — mark notifications as read
 *
 * Proxies to notify-svc (services/notify-svc).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL || 'http://localhost:3460';

const EMPTY_RESPONSE = { notifications: [], unreadCount: 0 };

/**
 * GET /api/notifications
 * Fetches notifications for the current teacher.
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${NOTIFY_SVC_URL}/notifications?page=1&pageSize=20`,
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
      console.error('[Notifications API] notify-svc returned', res.status);
      return NextResponse.json(EMPTY_RESPONSE);
    }

    const json = (await res.json()) as {
      data?: unknown[];
      pagination?: { total?: number };
    };

    return NextResponse.json({
      notifications: json.data ?? [],
      unreadCount:
        (json.pagination as Record<string, number> | undefined)?.total ?? 0,
    });
  } catch (error) {
    console.error('[Notifications API] Failed to fetch:', error);
    return NextResponse.json(EMPTY_RESPONSE);
  }
}

/**
 * POST /api/notifications
 * Marks notifications as read.
 * Body: { notificationIds: string[] }
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { notificationIds?: string[] };

  if (!body.notificationIds?.length) {
    return NextResponse.json({ error: 'notificationIds required' }, { status: 400 });
  }

  try {
    // Use read-all endpoint when no specific IDs filter is needed,
    // otherwise mark individual notifications
    const promises = body.notificationIds.map((id) =>
      fetch(`${NOTIFY_SVC_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'X-Tenant-Id': session.tenantId,
          'X-User-Id': session.userId,
          'X-Internal-Service': 'web-teacher',
        },
      }),
    );

    await Promise.all(promises);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications API] Failed to mark read:', error);
    return NextResponse.json(
      { error: 'Notification service unavailable' },
      { status: 502 },
    );
  }
}
