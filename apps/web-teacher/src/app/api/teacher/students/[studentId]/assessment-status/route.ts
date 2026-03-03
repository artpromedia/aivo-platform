/**
 * Assessment-Status BFF Route
 *
 * GET /api/teacher/students/:studentId/assessment-status
 *
 * Queries baseline-svc for the learner's baseline profile and parent
 * assessment, then returns a simplified status object for the UI.
 */

import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BASELINE_SVC_URL = process.env.BASELINE_SVC_URL ?? 'http://localhost:4005';

interface BaselineProfile {
  id: string;
  status: string;
  parentAssessment?: {
    id: string;
    status: string;
  } | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { studentId } = await params;

  try {
    const res = await fetch(
      `${BASELINE_SVC_URL}/baseline/profiles?learnerId=${studentId}&tenantId=${session.tenantId}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'X-Tenant-Id': session.tenantId,
          'X-User-Id': session.userId,
        },
      },
    );

    if (!res.ok) {
      // No profile found — student hasn't been set up yet
      return NextResponse.json({
        baselineStatus: 'NONE',
        parentAssessmentStatus: 'NONE',
      });
    }

    const data = (await res.json()) as BaselineProfile | BaselineProfile[];

    // baseline-svc may return an array or a single object
    const profile = Array.isArray(data) ? data[0] : data;

    if (!profile) {
      return NextResponse.json({
        baselineStatus: 'NONE',
        parentAssessmentStatus: 'NONE',
      });
    }

    return NextResponse.json({
      baselineStatus: profile.status ?? 'NONE',
      parentAssessmentStatus: profile.parentAssessment?.status ?? 'NONE',
    });
  } catch {
    return NextResponse.json(
      { error: 'Baseline service unavailable' },
      { status: 502 },
    );
  }
}
