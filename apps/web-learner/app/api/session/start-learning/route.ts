/**
 * POST /api/session/start-learning
 *
 * BFF route to start a learning session with content selection.
 * 1. Checks that the learner has completed their baseline assessment
 * 2. Ensures a learning path exists (triggers generation if missing)
 * 3. Proxies to session-svc POST /sessions/start-learning
 *
 * Request body:
 *   - subject: 'ELA' | 'MATH' | 'SCIENCE' | 'SEL' | 'SPEECH' | 'OTHER'
 *   - minutesAvailable?: number (default: 30)
 *
 * The learner's tenantId, learnerId, and gradeLevel are read from the JWT.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getTokenPayload, getRawToken } from '@/lib/api-route-helpers';

const SESSION_SVC_URL = process.env.SESSION_SVC_URL || 'http://localhost:4020';
const BASELINE_SVC_URL = process.env.BASELINE_SVC_URL || 'http://localhost:4011';
const BRAIN_ORCHESTRATOR_SVC_URL = process.env.BRAIN_ORCHESTRATOR_SVC_URL || 'http://localhost:4018';

export async function POST(request: NextRequest) {
  const payload = getTokenPayload();
  if (!payload?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = getRawToken();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const subject = body.subject as string | undefined;
  if (!subject) {
    return NextResponse.json(
      { error: 'subject is required (ELA, MATH, SCIENCE, SEL, SPEECH, or OTHER)' },
      { status: 400 },
    );
  }

  const minutesAvailable =
    typeof body.minutesAvailable === 'number' ? body.minutesAvailable : 30;

  // ── Step 1: Check baseline completion ──────────────────
  try {
    const baselineRes = await fetch(
      `${BASELINE_SVC_URL}/baseline/profiles/by-learner/${payload.sub}/status`,
      {
        headers: {
          'X-Service-Name': 'web-learner',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (baselineRes.ok) {
      const baselineData = (await baselineRes.json()) as Record<string, unknown>;
      const status = baselineData.status as string | undefined;
      if (status && !['COMPLETED', 'FINAL_ACCEPTED'].includes(status)) {
        return NextResponse.json(
          { error: 'Please complete your baseline assessment first', code: 'BASELINE_INCOMPLETE' },
          { status: 409 },
        );
      }
    }
    // If baseline-svc is unreachable or 404, allow the learner to proceed
    // (they may be on a path that doesn't require baseline)
  } catch {
    console.warn('[start-learning] Could not verify baseline status — proceeding');
  }

  // ── Step 2: Ensure learning path exists ────────────────
  try {
    const pathRes = await fetch(
      `${BRAIN_ORCHESTRATOR_SVC_URL}/api/v1/brain/learning-paths/${payload.sub}/active`,
      {
        headers: {
          'X-Service-Name': 'web-learner',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (pathRes.status === 404) {
      // No learning path yet — trigger generation
      console.log('[start-learning] No active learning path found — triggering generation');
      await fetch(`${BRAIN_ORCHESTRATOR_SVC_URL}/api/v1/brain/baseline-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'web-learner',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'BASELINE_COMPLETED',
          tenantId: payload.tenantId || 'consumer',
          learnerId: payload.sub,
          profileId: 'auto',
          attemptId: 'auto',
          gradeBand: payload.grade || 'K5',
          domainScores: [],
          timestamp: new Date().toISOString(),
        }),
      }).catch((err: unknown) => {
        console.warn('[start-learning] Learning path generation trigger failed:', err);
      });
    }
  } catch {
    console.warn('[start-learning] Could not check learning path — proceeding');
  }

  // ── Step 3: Proxy to session-svc ───────────────────────
  const sessionPayload = {
    tenantId: payload.tenantId || 'consumer',
    learnerId: payload.sub,
    subject,
    gradeLevel: payload.grade || undefined,
    origin: 'WEB_LEARNER',
    minutesAvailable,
  };

  try {
    const response = await fetch(`${SESSION_SVC_URL}/sessions/start-learning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'web-learner',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(sessionPayload),
    });

    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      return NextResponse.json(data, { status: 201 });
    }

    // Forward error from session-svc
    const errorData = (await response.json().catch(() => ({ error: 'Session service error' }))) as Record<string, unknown>;
    return NextResponse.json(errorData, { status: response.status });
  } catch (fetchError) {
    console.error('[start-learning] session-svc unreachable:', fetchError);

    // Fallback: return a local session stub so the frontend can still work
    const fallbackSession = {
      session: {
        id: `local_${Date.now()}`,
        tenantId: sessionPayload.tenantId,
        learnerId: payload.sub,
        sessionType: 'LEARNING',
        origin: 'WEB_LEARNER',
        startedAt: new Date().toISOString(),
        metadata: { subject, minutesAvailable, fallback: true },
      },
      content: {
        items: [],
        total: 0,
        subject,
        gradeBand: null,
      },
    };

    return NextResponse.json(fallbackSession, { status: 201 });
  }
}
