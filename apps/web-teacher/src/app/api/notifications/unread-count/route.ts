/**
 * Teacher Unread Notification Count API Route
 *
 * GET /api/notifications/unread-count — returns the unread count for the teacher
 *
 * Proxies to notify-svc GET /notifications/unread-count
 */

import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL || 'http://localhost:3460';

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${NOTIFY_SVC_URL}/notifications/unread-count`,
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
      console.error('[Unread Count API] notify-svc returned', res.status);
      return NextResponse.json({ count: 0 });
    }

    const json = (await res.json()) as { data?: { count?: number } };
    return NextResponse.json({ count: json.data?.count ?? 0 });
  } catch (error) {
    console.error('[Unread Count API] Failed to fetch:', error);
    return NextResponse.json({ count: 0 });
  }
}
