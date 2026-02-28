/**
 * GET  /api/learner/settings — fetch notification settings
 * PUT  /api/learner/settings — update notification settings
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const NOTIFY_SVC_URL = process.env.NOTIFY_SVC_URL || 'http://localhost:3460';

const DEFAULTS = {
  soundsEnabled: true,
  streakRemindersEnabled: true,
  achievementsEnabled: true,
  remindersEnabled: true,
  encouragementEnabled: true,
};

export async function GET() {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getRawToken();
  const learnerId = payload.sub;

  const result = await proxyGet<{ data: Record<string, unknown> }>(
    NOTIFY_SVC_URL,
    `/learner-settings/${learnerId}`,
    token
  );

  return NextResponse.json(result?.data ?? DEFAULTS);
}

export async function PUT(request: NextRequest) {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getRawToken();
  const learnerId = payload.sub;
  const body = (await request.json()) as Record<string, unknown>;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-Service': 'web-learner',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${NOTIFY_SVC_URL}/learner-settings/${learnerId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to update settings' }, { status: res.status });
    }

    const updated = await res.json();
    return NextResponse.json(updated?.data ?? updated);
  } catch {
    return NextResponse.json({ error: 'Settings service unavailable' }, { status: 502 });
  }
}
