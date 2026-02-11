/**
 * GET  /api/learner/goals     — list all goals
 * POST /api/learner/goals     — create a new goal (future)
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const GOAL_SVC_URL = process.env.GOAL_SVC_URL || 'http://localhost:3440';

export async function GET() {
  const payload = getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();
  const learnerId = payload.sub;
  const firstName = payload.firstName || 'Learner';

  const [active, completed] = await Promise.all([
    proxyGet<unknown[]>(
      GOAL_SVC_URL,
      `/api/learners/${learnerId}/goals?status=ACTIVE`,
      token,
    ),
    proxyGet<unknown[]>(
      GOAL_SVC_URL,
      `/api/learners/${learnerId}/goals?status=COMPLETED`,
      token,
    ),
  ]);

  return NextResponse.json({
    active: active ?? [],
    completed: completed ?? [],
    firstName,
  });
}
