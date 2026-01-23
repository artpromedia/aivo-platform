/**
 * GET /api/billing/pilots
 * POST /api/billing/pilots
 *
 * List and create pilot programs.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type PilotFilters, type CreatePilotInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: PilotFilters = {};

    const tenantId = searchParams.get('tenantId');
    const enterpriseCustomerId = searchParams.get('enterpriseCustomerId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const endingWithinDays = searchParams.get('endingWithinDays');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (tenantId) filters.tenantId = tenantId;
    if (enterpriseCustomerId) filters.enterpriseCustomerId = enterpriseCustomerId;
    if (status) (filters as Record<string, unknown>).status = status;
    if (type) (filters as Record<string, unknown>).type = type;
    if (endingWithinDays) filters.endingWithinDays = parseInt(endingWithinDays);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getPilotPrograms(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch pilots:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch pilots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const body = (await request.json()) as CreatePilotInput;
    const response = await billingApi.createPilot(body, { accessToken });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create pilot:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create pilot' }, { status: 500 });
  }
}
