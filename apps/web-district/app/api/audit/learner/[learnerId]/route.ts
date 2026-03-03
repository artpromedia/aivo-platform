/**
 * Learner Audit API Route
 *
 * Proxy to analytics-svc for learner-specific audit events.
 * Used by the learner-audit-timeline client component.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3010';

// GET /api/audit/learner/[learnerId] — audit timeline for a learner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ learnerId: string }> }
) {
  try {
    const { learnerId } = await params;
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get('Authorization') || '';

    // Forward query params
    const qs = new URLSearchParams();
    const entityType = searchParams.get('entityType');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (entityType) qs.set('entityType', entityType);
    if (fromDate) qs.set('fromDate', fromDate);
    if (toDate) qs.set('toDate', toDate);
    if (limit) qs.set('limit', limit);
    if (offset) qs.set('offset', offset);

    const url = `${ANALYTICS_SERVICE_URL}/audit/learner/${learnerId}?${qs.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Failed to fetch learner audit: ${text}` },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch learner audit' }, { status: 500 });
  }
}
