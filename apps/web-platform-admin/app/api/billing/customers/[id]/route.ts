/**
 * GET /api/billing/customers/[id]
 * PATCH /api/billing/customers/[id]
 *
 * Get and update an enterprise customer.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type CreateCustomerInput } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const response = await billingApi.getCustomer(id, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch customer:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';
    const { id } = await params;

    const body = (await request.json()) as Partial<CreateCustomerInput>;
    const response = await billingApi.updateCustomer(id, body, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to update customer:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
