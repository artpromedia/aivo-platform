/**
 * Alert Dismiss BFF Route
 *
 * POST /api/alerts/[alertId]/dismiss — dismiss an intervention alert
 *
 * Proxies to the API gateway.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type RouteContext = { params: Promise<{ alertId: string }> };

/**
 * POST /api/alerts/[alertId]/dismiss
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { alertId } = await context.params;

  try {
    const res = await fetch(
      `${API_GATEWAY_URL}/api/alerts/${alertId}/dismiss`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'X-Tenant-Id': session.tenantId,
          'X-User-Id': session.userId,
          'X-Internal-Service': 'web-teacher',
        },
      },
    );

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: errData.message || 'Failed to dismiss alert' },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Alerts service unavailable' }, { status: 502 });
  }
}
