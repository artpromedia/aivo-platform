/**
 * GET /api/billing/vault/audit
 *
 * List vault audit logs.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { billingApi, type VaultAuditFilters } from '@/lib/api/billing.api';
import { requirePlatformAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const accessToken = (session as { accessToken?: string })?.accessToken || '';

    const searchParams = request.nextUrl.searchParams;
    const filters: VaultAuditFilters = {};

    const action = searchParams.get('action');
    const licenseId = searchParams.get('licenseId');
    const actorId = searchParams.get('actorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (action) filters.action = action;
    if (licenseId) filters.licenseId = licenseId;
    if (actorId) filters.performedBy = actorId;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const response = await billingApi.getVaultAuditLogs(filters, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch vault audit logs:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch vault audit logs' }, { status: 500 });
  }
}
