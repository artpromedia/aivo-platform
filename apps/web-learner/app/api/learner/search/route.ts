/**
 * GET /api/learner/search?q=<query>
 *
 * Proxies to content-svc for search results.
 * Falls back to an empty result set when the service is unavailable.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken, proxyGet } from '../../../../lib/api-route-helpers';

const CONTENT_SVC_URL = process.env.CONTENT_SVC_URL || 'http://localhost:3430';

interface SearchHit {
  id: string;
  type: 'course' | 'lesson' | 'game';
  title: string;
  subtitle: string;
  href: string;
  emoji: string;
}

interface SearchResponse {
  results: SearchHit[];
}

export async function GET(request: NextRequest) {
  const payload = await getTokenPayload();
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const token = await getRawToken();
  const learnerId = payload.sub;

  const result = await proxyGet<SearchResponse>(
    CONTENT_SVC_URL,
    `/api/content/search?q=${encodeURIComponent(q)}&learnerId=${learnerId}`,
    token,
  );

  return NextResponse.json(result ?? { results: [] });
}
