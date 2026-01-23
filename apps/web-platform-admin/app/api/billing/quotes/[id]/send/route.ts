/**
 * POST /api/billing/quotes/[id]/send
 *
 * Send a quote to the customer.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const response = await billingApi.sendQuote(id, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to send quote:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to send quote' }, { status: 500 });
  }
}
