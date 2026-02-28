/**
 * POST /api/learner/emotion-checkin
 *
 * Records an emotion check-in event (before or after a calming activity).
 * Proxies to ANALYTICS_SVC_URL /api/learners/:learnerId/emotion-checkins
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken } from '../../../../lib/api-route-helpers';

const ANALYTICS_SVC_URL = process.env.ANALYTICS_SVC_URL || 'http://localhost:3450';

interface EmotionCheckinBody {
  emotion: string;
  intensity: number;     // 1-5
  context: 'before' | 'after';
  activity?: string;     // which calming activity they did
}

export async function POST(request: Request) {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as EmotionCheckinBody;

  if (!body.emotion || !body.context) {
    return NextResponse.json(
      { error: 'emotion and context are required.' },
      { status: 400 },
    );
  }

  const token = await getRawToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Service': 'web-learner',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `${ANALYTICS_SVC_URL}/api/learners/${payload.sub}/emotion-checkins`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...body,
          timestamp: new Date().toISOString(),
        }),
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to record emotion check-in.' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Could not reach analytics service.' },
      { status: 502 },
    );
  }
}
