/**
 * AI Feedback Generation API Route
 *
 * POST /api/ai/feedback — Generate personalized student feedback via AI Orchestrator
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const AI_ORCHESTRATOR_URL =
  process.env.AI_ORCHESTRATOR_URL || 'http://localhost:3420';

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const res = await fetch(`${AI_ORCHESTRATOR_URL}/api/ai/generate-feedback`, {
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

    if (!res.ok) {
      const msg =
        res.status === 429
          ? 'Too many requests — please wait a moment.'
          : 'Failed to generate feedback. Please try again.';
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'AI service unavailable. Please try again later.' },
      { status: 502 },
    );
  }
}
