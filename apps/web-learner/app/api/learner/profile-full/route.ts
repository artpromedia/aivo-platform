/**
 * GET   /api/learner/profile-full — full profile, stats, journey
 * PATCH /api/learner/profile-full — update avatar or settings
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const PROFILE_SVC_URL = process.env.PROFILE_SVC_URL || 'http://localhost:3420';
const ANALYTICS_SVC_URL = process.env.ANALYTICS_SVC_URL || 'http://localhost:3450';

export async function GET() {
  const payload = getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();
  const learnerId = payload.sub;

  const [profile, stats, journey] = await Promise.all([
    proxyGet<Record<string, unknown>>(
      PROFILE_SVC_URL,
      `/api/learners/${learnerId}`,
      token,
    ),
    proxyGet<Record<string, unknown>>(
      ANALYTICS_SVC_URL,
      `/api/learners/${learnerId}/stats`,
      token,
    ),
    proxyGet<{ items: unknown[] }>(
      ANALYTICS_SVC_URL,
      `/api/learners/${learnerId}/journey`,
      token,
    ),
  ]);

  return NextResponse.json({
    learner: profile ?? {
      firstName: payload.firstName ?? '',
      lastName: payload.lastName ?? '',
      grade: payload.grade ?? '',
      school: '',
      avatar: '🦸',
      xp: 0,
      level: 1,
      streakDays: 0,
      joinDate: new Date().toISOString(),
      learningStyle: '',
      interests: [],
    },
    stats: stats ?? {
      lessonsCompleted: 0,
      quizzesPassed: 0,
      hoursLearned: 0,
      achievementsEarned: 0,
    },
    journey: journey?.items ?? [],
  });
}

export async function PATCH(request: NextRequest) {
  const payload = getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();
  const learnerId = payload.sub;
  const body = (await request.json()) as Record<string, unknown>;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-Service': 'web-learner',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${PROFILE_SVC_URL}/api/learners/${learnerId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: res.status },
      );
    }

    const updated = await res.json();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Profile service unavailable' },
      { status: 502 },
    );
  }
}
