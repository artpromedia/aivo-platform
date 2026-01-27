/**
 * POST /api/billing/vault/codes/:id/revoke
 *
 * Revoke a vault access code.
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

    const body = await request.json().catch(() => ({})) as { reason?: string };
    const reason = body.reason || 'Revoked by admin';

    const response = await billingApi.revokeCode(id, reason, { accessToken });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to revoke code:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to revoke code' }, { status: 500 });
  }
}
