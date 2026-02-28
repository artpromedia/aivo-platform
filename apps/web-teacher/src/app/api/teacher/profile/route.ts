/**
 * Teacher Profile API Route
 *
 * GET  /api/teacher/profile — fetch current teacher profile
 * PUT  /api/teacher/profile — update teacher profile
 *
 * Proxies to auth-svc.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const AUTH_SVC_URL = process.env.AUTH_SVC_URL ?? 'http://localhost:4001';

/**
 * GET /api/teacher/profile
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${AUTH_SVC_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
    });

    if (!res.ok) {
      console.error('[Teacher Profile API] auth-svc returned', res.status);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Profile service unavailable' },
      { status: 502 },
    );
  }
}

/**
 * PUT /api/teacher/profile
 */
export async function PUT(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const res = await fetch(`${AUTH_SVC_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Tenant-Id': session.tenantId,
        'X-User-Id': session.userId,
        'X-Internal-Service': 'web-teacher',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (errData as { message?: string }).message || 'Failed to update profile' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Profile service unavailable' },
      { status: 502 },
    );
  }
}
