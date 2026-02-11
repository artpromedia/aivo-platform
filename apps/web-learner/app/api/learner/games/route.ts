/**
 * GET /api/learner/games
 *
 * Returns available games and the daily challenge for the learner.
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

  const [games, dailyChallenge] = await Promise.all([
    proxyGet<unknown[]>(
      CONTENT_SVC_URL,
      `/api/games/library?learnerId=${learnerId}`,
      token,
    ),
    proxyGet<unknown>(
      CONTENT_SVC_URL,
      `/api/games/daily-challenge?learnerId=${learnerId}`,
      token,
    ),
  ]);

  return NextResponse.json({
    games: games ?? [],
    dailyChallenge: dailyChallenge ?? null,
  });
}
