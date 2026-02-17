/**
 * POST /api/session/start-learning
 *
 * BFF route to start a learning session with content selection.
 * Proxies to session-svc POST /sessions/start-learning, which creates
 * the session and calls content-svc to select appropriate Learning Objects.
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

  // Build session-svc request
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
