/**
 * GET /api/learner/assessments
 *
 * Returns upcoming and completed assessments for the learner.
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const ASSESSMENT_SVC_URL = process.env.ASSESSMENT_SVC_URL || 'http://localhost:3470';

export async function GET() {
  const payload = getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();
  const learnerId = payload.sub;
  const firstName = payload.firstName || 'Learner';

  const [upcoming, completed] = await Promise.all([
    proxyGet<unknown[]>(
      ASSESSMENT_SVC_URL,
      `/api/learners/${learnerId}/assessments?status=upcoming`,
      token,
    ),
    proxyGet<unknown[]>(
      ASSESSMENT_SVC_URL,
      `/api/learners/${learnerId}/assessments?status=completed`,
      token,
    ),
  ]);

  return NextResponse.json({
    upcoming: upcoming ?? [],
    completed: completed ?? [],
    firstName,
  });
}
