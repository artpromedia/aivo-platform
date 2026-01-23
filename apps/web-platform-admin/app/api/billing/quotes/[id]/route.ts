/**
 * GET /api/billing/quotes/[id]
 * PATCH /api/billing/quotes/[id]
 *
 * Get and update a specific quote.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type UpdateQuoteInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const response = await billingApi.getQuote(id, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch quote:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const body = (await request.json()) as UpdateQuoteInput;
    const response = await billingApi.updateQuote(id, body, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to update quote:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
