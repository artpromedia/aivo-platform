import { NextResponse } from 'next/server';

import { getAuthSession } from '../../../../lib/auth';

// ============================================================================
// Data Retention Settings API
//
// GET  /api/settings/retention  — Fetch current retention policies
// PATCH /api/settings/retention — Update retention policies
//
// Proxies to ts-policy-engine via POLICY_ENGINE_URL.
// ============================================================================

const POLICY_ENGINE_URL =
  process.env.POLICY_ENGINE_URL || 'http://localhost:4015';

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${POLICY_ENGINE_URL}/retention-policies/${session.tenantId}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to fetch retention policies' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[retention API] Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.text();

    const res = await fetch(
      `${POLICY_ENGINE_URL}/retention-policies/${session.tenantId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'x-tenant-id': session.tenantId,
        },
        body,
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to update retention policies' },
        { status: res.status },
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[retention API] Error updating policies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
