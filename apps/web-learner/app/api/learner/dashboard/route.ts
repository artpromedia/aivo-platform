/**
 * GET /api/learner/dashboard
 *
 * Aggregates data from personalization-svc, goal-svc, analytics-svc
 * to build the learner dashboard view.
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const PERSONALIZATION_SVC_URL = process.env.PERSONALIZATION_SVC_URL || 'http://localhost:3430';
const GOAL_SVC_URL = process.env.GOAL_SVC_URL || 'http://localhost:3440';
const ANALYTICS_SVC_URL = process.env.ANALYTICS_SVC_URL || 'http://localhost:3450';
const GAMIFICATION_SVC_URL = process.env.GAMIFICATION_SVC_URL || 'http://localhost:3006';

export async function GET() {
  const payload = getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();
  const learnerId = payload.sub;
  const firstName = payload.firstName || 'Learner';

  // Fire all backend calls in parallel — gracefully degrade if any fail
  const [continueLearning, dailyGoals, achievements, upcoming, streakData, gamification] =
    await Promise.all([
      proxyGet<{ items: unknown[] }>(
        PERSONALIZATION_SVC_URL,
        `/api/learners/${learnerId}/continue-learning`,
        token
      ),
      proxyGet<{ goals: unknown[] }>(GOAL_SVC_URL, `/api/learners/${learnerId}/daily-goals`, token),
      proxyGet<{ items: unknown[] }>(
        ANALYTICS_SVC_URL,
        `/api/learners/${learnerId}/achievements/recent`,
        token
      ),
      proxyGet<{ items: unknown[] }>(
        ANALYTICS_SVC_URL,
        `/api/learners/${learnerId}/upcoming`,
        token
      ),
      proxyGet<{ streakDays: number; totalXp: number }>(
        ANALYTICS_SVC_URL,
        `/api/learners/${learnerId}/streak`,
        token
      ),
      proxyGet<{ totalXP: number; level: number; xpToNextLevel: number; currentStreak: number }>(
        GAMIFICATION_SVC_URL,
        `/api/gamification/profile`,
        token
      ),
    ]);

  return NextResponse.json({
    continueLearning: continueLearning?.items ?? [],
    dailyGoals: dailyGoals?.goals ?? [],
    achievements: achievements?.items ?? [],
    upcoming: upcoming?.items ?? [],
    streakDays: gamification?.currentStreak ?? streakData?.streakDays ?? 0,
    totalXp: gamification?.totalXP ?? streakData?.totalXp ?? 0,
    level: gamification?.level ?? 1,
    xpToNextLevel: gamification?.xpToNextLevel ?? 100,
    firstName,
  });
}
