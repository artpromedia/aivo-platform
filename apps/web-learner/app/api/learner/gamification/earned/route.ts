/**
 * GET /api/learner/gamification/earned
 *
 * Proxies to gamification-svc to retrieve badges earned by the current learner.
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../../lib/api-route-helpers';

const GAMIFICATION_SVC_URL = process.env.GAMIFICATION_SVC_URL || 'http://localhost:3006';

export async function GET() {
  const payload = getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();
  const learnerId = payload.sub;

  const data = await proxyGet<{ badges: unknown[] }>(
    GAMIFICATION_SVC_URL,
    `/gamification/${learnerId}/badges`,
    token
  );

  return NextResponse.json({ badges: data?.badges ?? [] });
}
