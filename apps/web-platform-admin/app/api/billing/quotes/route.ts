/**
 * GET /api/billing/quotes
 * POST /api/billing/quotes
 *
 * List and create quotes.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type QuoteFilters, type CreateQuoteInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: QuoteFilters = {};

    const status = searchParams.get('status');
    const tenantId = searchParams.get('tenantId');
    const billingAccountId = searchParams.get('billingAccountId');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (status) (filters as Record<string, unknown>).status = status;
    if (tenantId) filters.tenantId = tenantId;
    if (billingAccountId) filters.billingAccountId = billingAccountId;
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getQuotes(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch quotes:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const body = (await request.json()) as CreateQuoteInput;
    const response = await billingApi.createQuote(body, { accessToken });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create quote:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
