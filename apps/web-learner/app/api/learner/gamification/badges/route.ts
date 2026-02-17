/**
 * GET /api/learner/gamification/badges
 *
 * Proxies to gamification-svc to retrieve all available badge definitions.
 */

import { NextResponse } from 'next/server';

import { proxyGet } from '../../../../../lib/api-route-helpers';

const GAMIFICATION_SVC_URL = process.env.GAMIFICATION_SVC_URL || 'http://localhost:3006';

export async function GET() {
  const data = await proxyGet<{ badges: unknown[] }>(GAMIFICATION_SVC_URL, '/gamification/badges');

  return NextResponse.json({ badges: data?.badges ?? [] });
}
