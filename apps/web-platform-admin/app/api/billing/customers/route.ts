/**
 * GET /api/billing/customers
 * POST /api/billing/customers
 *
 * List and create enterprise customers.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type CustomerFilters, type CreateCustomerInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: CustomerFilters = {};

    const type = searchParams.get('type');
    const salesRepId = searchParams.get('salesRepId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (type) (filters as Record<string, unknown>).type = type;
    if (salesRepId) filters.salesRepId = salesRepId;
    if (isActive !== null) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getCustomers(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const body = (await request.json()) as CreateCustomerInput;
    const response = await billingApi.createCustomer(body, { accessToken });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to create customer:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
