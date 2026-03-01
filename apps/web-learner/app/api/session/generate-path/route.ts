/**
 * POST /api/session/generate-path
 *
 * BFF route to trigger adaptive learning-path generation after baseline.
 * Calls brain-orchestrator-svc POST /api/v1/brain/learners/:learnerId/generate-path
 * which is idempotent (returns existing path if one already exists).
 */

import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken } from '@/lib/api-route-helpers';

const BRAIN_ORCHESTRATOR_SVC_URL =
  process.env.BRAIN_ORCHESTRATOR_SVC_URL || 'http://localhost:4020';

export async function POST() {
  const payload = await getTokenPayload();
  if (!payload?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getRawToken();
  const learnerId =
    ((payload as Record<string, unknown>).learnerId as string | undefined) ?? payload.sub;

  try {
    const res = await fetch(
      `${BRAIN_ORCHESTRATOR_SVC_URL}/api/v1/brain/learners/${learnerId}/generate-path`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          assessmentId: '',
          skillEstimates: [],
        }),
        signal: AbortSignal.timeout(35_000),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Failed to generate learning path', detail: text.slice(0, 200) },
        { status: res.status }
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[generate-path] Error:', err);
    return NextResponse.json({ error: 'Failed to reach brain-orchestrator' }, { status: 502 });
  }
}
