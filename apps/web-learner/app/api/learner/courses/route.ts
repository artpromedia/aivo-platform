/**
 * GET /api/learner/courses
 *
 * Returns the enrolled courses for the authenticated learner
 * from the content-svc / personalization-svc.
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const CONTENT_SVC_URL = process.env.CONTENT_SVC_URL || 'http://localhost:3460';

export async function GET() {
  const payload = getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();
  const learnerId = payload.sub;

  const courses = await proxyGet<unknown[]>(
    CONTENT_SVC_URL,
    `/api/learners/${learnerId}/courses`,
    token,
  );

  return NextResponse.json(courses ?? []);
}
