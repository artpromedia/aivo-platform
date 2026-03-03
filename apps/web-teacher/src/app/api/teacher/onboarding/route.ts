/**
 * Onboarding BFF Route
 *
 * GET  /api/teacher/onboarding — fetch current onboarding progress
 * POST /api/teacher/onboarding — mark a step completed/skipped or dismiss the wizard
 *
 * Persists onboarding progress to auth-svc (teacher profile metadata).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function buildHeaders(session: { accessToken: string; tenantId: string; userId: string }) {
  return {
    Authorization: `Bearer ${session.accessToken}`,
    'X-Tenant-Id': session.tenantId,
    'X-User-Id': session.userId,
    'X-Internal-Service': 'web-teacher',
    'Content-Type': 'application/json',
  };
}

/**
 * GET /api/teacher/onboarding
 * Returns the teacher's onboarding progress.
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${API_GATEWAY_URL}/api/teacher/onboarding/progress`,
      { headers: buildHeaders(session) },
    );

    if (!res.ok) {
      // 404 = no progress yet — return a default fresh progress object
      if (res.status === 404) {
        return NextResponse.json({
          userId: session.userId,
          tenantId: session.tenantId,
          flowId: 'teacher',
          completedSteps: [],
          skippedSteps: [],
          currentStepId: 'teacher_welcome',
          startedAt: new Date().toISOString(),
          completedAt: null,
          dismissed: false,
        });
      }
      return NextResponse.json(
        { error: 'Failed to fetch onboarding progress' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Onboarding service unavailable' },
      { status: 502 },
    );
  }
}

/**
 * POST /api/teacher/onboarding
 * Body can contain:
 *   - { completionKey, stepId } — mark a step as completed
 *   - { stepId, skipped: true } — mark a step as skipped
 *   - { dismissed: true }       — dismiss the wizard
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();

    const res = await fetch(
      `${API_GATEWAY_URL}/api/teacher/onboarding/progress`,
      {
        method: 'POST',
        headers: buildHeaders(session),
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errData.message || 'Failed to update onboarding progress' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Onboarding service unavailable' },
      { status: 502 },
    );
  }
}
