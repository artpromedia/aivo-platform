/**
 * POST /api/billing/deals/[id]/win
 *
 * Mark a deal as won.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const response = await billingApi.winDeal(id, body.notes, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to mark deal as won:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to mark deal as won' }, { status: 500 });
  }
}
