/**
 * GET /api/learner/progress
 *
 * Returns analytics / progress summary for the learner.
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const ANALYTICS_SVC_URL = process.env.ANALYTICS_SVC_URL || 'http://localhost:3450';

export async function GET() {
  const payload = getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();
  const learnerId = payload.sub;

  const [weeklyStats, subjectProgress, skills, recentActivity, streak] =
    await Promise.all([
      proxyGet<unknown[]>(
        ANALYTICS_SVC_URL,
        `/api/learners/${learnerId}/progress/weekly`,
        token,
      ),
      proxyGet<unknown[]>(
        ANALYTICS_SVC_URL,
        `/api/learners/${learnerId}/progress/subjects`,
        token,
      ),
      proxyGet<unknown[]>(
        ANALYTICS_SVC_URL,
        `/api/learners/${learnerId}/progress/skills`,
        token,
      ),
      proxyGet<unknown[]>(
        ANALYTICS_SVC_URL,
        `/api/learners/${learnerId}/activity/recent`,
        token,
      ),
      proxyGet<{ streakDays: number; lessonsCompleted: number }>(
        ANALYTICS_SVC_URL,
        `/api/learners/${learnerId}/streak`,
        token,
      ),
    ]);

  return NextResponse.json({
    weeklyStats: weeklyStats ?? [],
    subjectProgress: subjectProgress ?? [],
    skills: skills ?? [],
    recentActivity: recentActivity ?? [],
    streakDays: streak?.streakDays ?? 0,
    lessonsCompleted: streak?.lessonsCompleted ?? 0,
  });
}
