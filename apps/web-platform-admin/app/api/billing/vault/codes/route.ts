/**
 * GET /api/billing/vault/codes
 * POST /api/billing/vault/codes
 *
 * List and generate vault access codes.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type VaultCodeFilters, type GenerateCodesInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: VaultCodeFilters = {};

    const status = searchParams.get('status');
    const campaignId = searchParams.get('campaignId');
    const batchId = searchParams.get('batchId');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (status) (filters as Record<string, unknown>).status = status;
    if (campaignId) filters.campaignId = campaignId;
    if (batchId) filters.batchId = batchId;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getVaultCodes(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch vault codes:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch vault codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const body = (await request.json()) as GenerateCodesInput;
    const response = await billingApi.generateCodes(body, { accessToken });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to generate codes:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 });
  }
}
