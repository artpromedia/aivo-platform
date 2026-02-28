/**
 * GET  /api/learner/notifications — fetch recent notifications
 * POST /api/learner/notifications — mark notifications as read
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL || 'http://localhost:3460';

const EMPTY_RESPONSE = { notifications: [], unreadCount: 0 };

export async function GET() {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getRawToken();
  const learnerId = payload.sub;

  const result = await proxyGet<{
    data: { notifications: unknown[]; unreadCount: number };
  }>(NOTIFY_SVC_URL, `/notifications?learnerId=${learnerId}&limit=10`, token);

  return NextResponse.json(result?.data ?? EMPTY_RESPONSE);
}

export async function POST(request: NextRequest) {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getRawToken();
  const body = (await request.json()) as { notificationIds: string[] };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-Service': 'web-learner',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${NOTIFY_SVC_URL}/notifications/mark-read`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        learnerId: payload.sub,
        notificationIds: body.notificationIds,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to mark notifications' },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Notification service unavailable' },
      { status: 502 },
    );
  }
}
