/**
 * POST /api/billing/renewals/[id]/[action]
 *
 * Process a renewal action (start, complete, not_renewing, churn).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type RenewalAction } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

const validActions = ['start', 'complete', 'not_renewing', 'churn'] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id, action } = await params;

    if (!validActions.includes(action as RenewalAction)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const response = await billingApi.processRenewal(id, action as RenewalAction, body.notes, {
      accessToken,
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to process renewal:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to process renewal' }, { status: 500 });
  }
}
