/**
 * GET /api/billing/vault/licenses
 * POST /api/billing/vault/licenses
 *
 * List and issue vault licenses.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type LicenseFilters, type IssueLicenseInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: LicenseFilters = {};

    const tenantId = searchParams.get('tenantId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const enterpriseDealId = searchParams.get('enterpriseDealId');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (tenantId) filters.tenantId = tenantId;
    if (type) (filters as Record<string, unknown>).type = type;
    if (status) (filters as Record<string, unknown>).status = status;
    if (enterpriseDealId) filters.enterpriseDealId = enterpriseDealId;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getVaultLicenses(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch vault licenses:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch vault licenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const body = (await request.json()) as IssueLicenseInput;
    const response = await billingApi.issueLicense(body, { accessToken });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to issue license:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to issue license' }, { status: 500 });
  }
}
