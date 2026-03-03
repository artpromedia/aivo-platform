/**
 * Students BFF Route
 *
 * GET  /api/teacher/students — list students for the current teacher
 * POST /api/teacher/students — enroll a new student + create baseline profile
 *
 * Proxies to the API gateway and baseline-svc.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const BASELINE_SVC_URL = process.env.BASELINE_SVC_URL ?? 'http://localhost:4005';

/**
 * Map a human-readable grade level to baseline-svc's GradeBand enum.
 */
function mapGradeToGradeBand(grade?: string): string {
  if (!grade) return 'K5';
  const g = grade.toUpperCase();
  if (['PRE-K', 'K', '1', '2', '3', '4', '5'].includes(g)) return 'K5';
  if (['6', '7', '8'].includes(g)) return 'G6_8';
  if (['9', '10', '11', '12'].includes(g)) return 'G9_12';
  return 'K5';
}

/**
 * GET /api/teacher/students
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const query = new URL(request.url).search;
    const res = await fetch(`${API_GATEWAY_URL}/api/teacher/students${query}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
    });

    if (!res.ok) {
      console.error('[Students BFF] gateway returned', res.status);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Students service unavailable' },
      { status: 502 },
    );
  }
}

/**
 * POST /api/teacher/students
 *
 * Orchestrates two calls:
 *   1. Create student record via API gateway
 *   2. Create baseline profile via baseline-svc (triggers assessment chain)
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    /* ── Step 1: Create the student record ────────────────────────────── */
    const studentRes = await fetch(`${API_GATEWAY_URL}/api/teacher/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
      body: JSON.stringify(body),
    });

    if (!studentRes.ok) {
      const errData = (await studentRes.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errData.message || 'Failed to create student' },
        { status: studentRes.status },
      );
    }

    const student = (await studentRes.json()) as { id: string; gradeLevel?: string };

    /* ── Step 2: Create baseline profile (triggers the assessment chain) ─ */
    let baselineProfileCreated = false;
    try {
      const gradeLevel = (body.gradeLevel as string | undefined) ?? student.gradeLevel;
      const baselineRes = await fetch(`${BASELINE_SVC_URL}/baseline/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'X-Tenant-Id': session.tenantId,
          'X-User-Id': session.userId,
        },
        body: JSON.stringify({
          tenantId: session.tenantId,
          learnerId: student.id,
          gradeBand: mapGradeToGradeBand(gradeLevel),
        }),
      });

      // 409 = profile already exists (idempotent, treat as success)
      baselineProfileCreated = baselineRes.ok || baselineRes.status === 409;

      if (!baselineRes.ok && baselineRes.status !== 409) {
        console.error(
          '[Students BFF] Baseline profile creation failed:',
          baselineRes.status,
          await baselineRes.text().catch(() => ''),
        );
      }
    } catch (baselineErr) {
      // Don't fail the enrollment — baseline can be created later
      console.error('[Students BFF] Baseline-svc unreachable:', baselineErr);
    }

    return NextResponse.json(
      {
        ...student,
        baselineProfileCreated,
        parentAssessmentTriggered: baselineProfileCreated,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Students service unavailable' },
      { status: 502 },
    );
  }
}
